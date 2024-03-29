import React, { PropsWithChildren } from "react";
import {IFaucetConfig} from "../../common/FaucetConfig";
import {FaucetApi} from "../../common/FaucetApi";
import {ClaimNotificationClient, IClaimNotificationUpdateData} from "./ClaimNotificationClient";
import {FaucetSession, IFaucetSessionStatus} from "../../common/FaucetSession";

export interface IClaimContainerProps {
  faucetConfig: IFaucetConfig;
  faucetApi: FaucetApi;
  sessionId: string;
  classes: any;
  onClose: () => void;

  wsEndpoint: string;
  showErrorNotification: (msg: string) => void;
  ErrorTextComponent: React.ComponentType<PropsWithChildren>;
  LoaderComponent: React.ComponentType;
  ClaimFormComponent: React.ComponentType<{
    onSubmit: () => Promise<void>;
    isLoading: boolean;
  }>;
  ClaimStatusComponent: React.ComponentType;
  ClaimSuccessComponent: React.ComponentType<{ hash?: string }>;
}

export interface IClaimContainerState {
  sessionStatus: IFaucetSessionStatus | null;
  sessionDetails: { data: any; claim: any } | null;
  loadingStatus: boolean;
  loadingError: string | boolean;
  isTimedOut: boolean;
  claimProcessing: boolean;
  refreshIndex: number;
  claimNotification: IClaimNotificationUpdateData | null;
  claimNotificationConnected: boolean;
}

export class ClaimContainer extends React.PureComponent<
  IClaimContainerProps,
  IClaimContainerState
> {
  private updateTimer: NodeJS.Timeout | null = null;
  private loadingStatus = false;
  private isTimedOut = false;
  private notificationClient: ClaimNotificationClient;
  private notificationClientActive = false;
  private lastStatusPoll = 0;

  constructor(props: IClaimContainerProps) {
    super(props);

    this.notificationClient = new ClaimNotificationClient({
      claimWsUrl: this.props.wsEndpoint,
      sessionId: this.props.sessionId,
    });
    this.notificationClient.on("update", (message: any) => {
      this.setState({
        claimNotification: message.data,
      });
    });
    this.notificationClient.on("open", () => {
      this.setState({
        claimNotificationConnected: true,
      });
    });
    this.notificationClient.on("close", () => {
      this.setState({
        claimNotificationConnected: false,
      });
    });

    this.state = {
      sessionStatus: null,
      sessionDetails: null,
      loadingStatus: false,
      loadingError: false,
      isTimedOut: false,
      claimProcessing: false,
      refreshIndex: 0,
      claimNotification: null,
      claimNotificationConnected: false,
    };
  }

  public componentDidMount() {
    void this.refreshSessionStatus();
  }

  public componentWillUnmount() {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    if (this.notificationClientActive) {
      this.notificationClientActive = false;
      this.notificationClient.stop();
    }
  }

  public render(): React.ReactElement<IClaimContainerProps> {
    const exactNow = new Date().getTime();
    const now = this.props.faucetApi.getFaucetTime().getSyncedTime();

    if (this.state.sessionStatus) {
      const claimTimeout =
        this.state.sessionStatus.start +
        this.props.faucetConfig.sessionTimeout -
        now;
      if (
        claimTimeout < 0 &&
        this.state.sessionStatus.status === "claimable" &&
        !this.isTimedOut
      ) {
        this.isTimedOut = true;
        this.setState({
          isTimedOut: true,
        });

        this.props.showErrorNotification(
          "Claim expired. Sorry, your reward has not been claimed in time."
        );
        this.props.onClose();
      }

      if (this.state.sessionStatus.status === "claiming") {
        if (!this.notificationClientActive) {
          this.notificationClientActive = true;
          this.notificationClient.start();
        }

        if (
          exactNow - this.lastStatusPoll > 30 * 1000 ||
          (this.state.sessionStatus.claimIdx ?? 0) <=
            (this.state.claimNotification?.confirmedIdx || 0)
        ) {
          this.lastStatusPoll = exactNow;
          void this.refreshSessionStatus();
        }
      } else {
        if (this.notificationClientActive) {
          this.notificationClientActive = false;
          this.notificationClient.stop();
        }
      }
    }

    return this.renderClaim();
  }

  private async refreshSessionStatus() {
    if (this.loadingStatus) {
      return;
    }

    this.loadingStatus = true;
    this.setState({
      loadingStatus: true,
    });

    try {
      const sessionStatus = await this.props.faucetApi.getSessionStatus(
        this.props.sessionId,
        !this.state.sessionDetails
      );
      if (sessionStatus.details) {
        this.setState({
          sessionDetails: sessionStatus.details,
        });
      }
      this.setState(
        {
          loadingStatus: false,
          sessionStatus,
        },
        () => {
          this.setUpdateTimer();
        }
      );
    } catch (err: any) {
      this.setState({
        loadingStatus: false,
        loadingError: err.error?.toString() || err.toString() || true,
      });
    }
    this.loadingStatus = false;
  }

  private setUpdateTimer() {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    const exactNow = new Date().getTime();

    const timeLeft = 1000 - (exactNow % 1000) + 2;
    this.updateTimer = setTimeout(() => {
      this.updateTimer = null;
      this.setState({
        refreshIndex: this.state.refreshIndex + 1,
      });
      this.setUpdateTimer();
    }, timeLeft);
  }

  private renderClaim(): React.ReactElement {
    const ErrorText = this.props.ErrorTextComponent;

    if (this.state.loadingError) {
      return (
        <ErrorText>
          No claimable reward found:{" "}
          {typeof this.state.loadingError === "string"
            ? this.state.loadingError
            : ""}
        </ErrorText>
      );
    } else if (!this.state.sessionStatus) {
      const Loader = this.props.LoaderComponent;
      return <Loader />;
    } else if (this.state.isTimedOut) {
      return (
        <ErrorText>Sorry, your reward has not been claimed in time.</ErrorText>
      );
    }

    return (
      <div>
        {this.state.sessionStatus.status === "claimable"
          ? this.renderClaimForm()
          : null}
        {this.state.sessionStatus.status === "claiming"
          ? this.renderClaimStatus()
          : null}
        {this.state.sessionStatus.status === "failed"
          ? this.renderSessionFailed()
          : null}
        {this.state.sessionStatus.status === "finished"
          ? this.renderClaimSuccess()
          : null}
      </div>
    );
  }

  private renderClaimForm(): React.ReactElement {
    const ClaimForm = this.props.ClaimFormComponent;
    return (
      <ClaimForm
        onSubmit={() => this.submitClaim({})}
        isLoading={this.state.sessionStatus?.status === "claiming"}
      />
    );
  }

  private renderClaimStatus(): React.ReactElement {
    const ClaimStatus = this.props.ClaimStatusComponent;
    return <ClaimStatus />;
  }

  private renderClaimSuccess(): React.ReactElement {
    const ClaimSuccess = this.props.ClaimSuccessComponent;

    return <ClaimSuccess hash={this.state.sessionStatus?.claimHash} />;
  }

  private renderSessionFailed(): React.ReactElement {
    const ErrorText = this.props.ErrorTextComponent;
    return (
      <ErrorText>
        Claim failed:{" "}
        {this.state.sessionStatus?.failedReason ||
          this.state.sessionStatus?.claimMessage}{" "}
        {this.state.sessionStatus?.failedCode
          ? " [" + this.state.sessionStatus?.failedCode + "]"
          : ""}
      </ErrorText>
    );
  }

  private async submitClaim(claimData: any): Promise<void> {
    try {
      claimData = Object.assign(
        {
          session: this.props.sessionId,
        },
        claimData || {}
      );

      const sessionStatus = await this.props.faucetApi.claimReward(claimData);
      if (sessionStatus.status === "failed") {
        throw sessionStatus;
      }

      this.lastStatusPoll = new Date().getTime();
      this.setState({
        sessionStatus,
      });
      FaucetSession.persistSessionInfo(null);
    } catch (ex: any) {
      let errMsg: string;
      if (ex && ex.failedCode) {
        errMsg = "[" + ex.failedCode + "] " + ex.failedReason;
      } else {
        errMsg = ex.toString();
      }
      this.props.showErrorNotification("Claim failed. " + errMsg);
      throw errMsg;
    }
  }
}
