import { IFaucetConfig } from '../../common/FaucetConfig';
import { FaucetConfigContext, FaucetPageContext } from '../FaucetPage';
import React, { useContext } from 'react';
import { useNavigate, NavigateFunction } from "react-router-dom";
import { FaucetInput } from './FaucetInput';
import { IFaucetContext } from '../../common/FaucetContext';
import { FaucetSession } from '../../common/FaucetSession';
import { RestoreSession } from './RestoreSession';

export interface IFrontPageProps {
  faucetContext: IFaucetContext;
  faucetConfig: IFaucetConfig;
  navigateFn: NavigateFunction;
}

export interface IFrontPageState {
  checkedStoredSession: boolean;
}

export class FrontPage extends React.PureComponent<IFrontPageProps, IFrontPageState> {
  private faucetInput = React.createRef<FaucetInput>();

  constructor(props: IFrontPageProps, state: IFrontPageState) {
    super(props);

    this.state = {
      checkedStoredSession: false,
		};
  }

  public componentDidMount() {
    if(!this.state.checkedStoredSession) {
      let sessionJson = FaucetSession.recoverSessionInfo();
      if(sessionJson) {
        this.props.faucetContext.faucetApi.getSessionStatus(sessionJson.id).then((sessionInfo) => {
          if(!sessionInfo)
            return;
          let actionLabel: string = null;
          let actionFn: () => void;
          switch(sessionInfo.status) {
            case "claimable":
              actionLabel = "Claim Rewards";
              actionFn = () => this.props.navigateFn("/claim/" + sessionInfo.session);
              break;
            case "running":
              if(sessionInfo.tasks.filter(t => t.module === "pow").length > 0) {
                actionLabel = "Continue Mining";
                actionFn = () => this.props.navigateFn("/mine/" + sessionInfo.session);
              }
              else
                return;
              break;
            default:
              return;
          }

          this.props.faucetContext.showDialog({
            title: "Restore Session",
            size: "700px",
            body: (
              <RestoreSession
                faucetConfig={this.props.faucetConfig}
                sessionStatus={sessionInfo}
              />
            ),
            applyButton: {
              caption: actionLabel,
              applyFn: actionFn,
            },
            closeButton: {
              caption: "Start new session"
            }
          })
        });
      }
    }
  }

	public render(): React.ReactElement<IFrontPageProps> {
    return (
      <div className='page-frontpage'>
        <div className='faucet-frontimage'>
          {this.props.faucetConfig.faucetImage ?
            <img src={this.props.faucetConfig.faucetImage} className="image" />
          : null}
        </div>
        <FaucetInput 
          ref={this.faucetInput} 
          faucetContext={this.props.faucetContext} 
          faucetConfig={this.props.faucetConfig} 
          submitInputs={(inputData) => this.onSubmitInputs(inputData)}/>
        
        <div className='faucet-description'>
          {this.props.faucetConfig.faucetHtml ?
            <div className="pow-home-container" dangerouslySetInnerHTML={{__html: this.props.faucetConfig.faucetHtml}} />
          : null}
        </div>
      </div>
    );
	}

  private async onSubmitInputs(inputData: any): Promise<void> {
    try {
      let sessionInfo = await this.props.faucetContext.faucetApi.startSession(inputData);
      if(sessionInfo.status === "failed") {
        this.props.faucetContext.showDialog({
          title: "Could not start session",
          body: (<div className='alert alert-danger'>{sessionInfo.failedReason}<br />{sessionInfo.failedCode ? "Code: " + sessionInfo.failedCode : ""}</div>),
          closeButton: { caption: "Close" },
        });
        return;
      }

      let session = new FaucetSession(this.props.faucetContext, sessionInfo.session, sessionInfo);
      this.props.faucetContext.activeSession = session;

      switch(sessionInfo.status) {
        case "claimable":
          // redirect to claim page
          console.log("redirect to claim page!", session);
          this.props.navigateFn("/claim/" + sessionInfo.session);
          return;
        case "running":
          if(sessionInfo.tasks?.filter((task) => task.module === "pow").length > 0) {
            // redirect to mining page
            console.log("redirect to mining page!", session);
            this.props.navigateFn("/mine/" + sessionInfo.session);
            return;
          }
          else {
            // session is running, but has an unknown or no task...
            throw "unexpected session task";
          }
        default:
          throw "unexpected session state";
      }
    } catch(ex) {
      this.props.faucetContext.showDialog({
        title: "Could not start session",
        body: (<div className='alert alert-danger'>Internal Error: {ex.toString()}</div>),
        closeButton: { caption: "Close" },
      });
    }
  }

}

export default (props) => {
  return (
    <FrontPage 
      {...props}
      faucetContext={useContext(FaucetPageContext)}
      faucetConfig={useContext(FaucetConfigContext)}
      navigateFn={useNavigate()}
    />
  );
};
