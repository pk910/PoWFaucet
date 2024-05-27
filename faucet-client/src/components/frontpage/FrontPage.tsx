import { IFaucetConfig } from '../../common/FaucetConfig';
import { FaucetConfigContext, FaucetPageContext } from '../FaucetPage';
import React, { useContext } from 'react';
import { useNavigate, NavigateFunction } from "react-router-dom";
import { FaucetInput } from './FaucetInput';
import { IFaucetContext } from '../../common/FaucetContext';
import { FaucetSession } from '../../common/FaucetSession';
import { RestoreSession } from './RestoreSession';
import { PassportInfo } from '../passport/PassportInfo';

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
    let faucetImage: string;
    if(this.props.faucetConfig.faucetImage) {
      faucetImage = this.props.faucetConfig.faucetImage;
      if(faucetImage.match(/^\/images\//) && this.props.faucetContext.faucetUrls.imagesUrl) {
        faucetImage = this.props.faucetContext.faucetUrls.imagesUrl + faucetImage.substring(7);
      }
    }

    return (
      <div className='page-frontpage'>
        <div className='faucet-frontimage'>
          {faucetImage ?
            <img src={faucetImage} className="image" />
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
        let canStartWithScore = false;
        let requiredScore = 0;
        let ipflags: string[] = [];

        if(sessionInfo.failedCode == "IPINFO_RESTRICTION" && this.props.faucetConfig.modules["passport"] && this.props.faucetConfig.modules["passport"].guestRefresh !== false && sessionInfo.failedData["ipflags"]) {
          canStartWithScore = true;
          if(sessionInfo.failedData["ipflags"][0] && this.props.faucetConfig.modules["passport"].overrideScores[0] > 0) {
            canStartWithScore = true;
            ipflags.push("hosting");
            if(this.props.faucetConfig.modules["passport"].overrideScores[0] > requiredScore)
              requiredScore = this.props.faucetConfig.modules["passport"].overrideScores[0];
          }
          if(sessionInfo.failedData["ipflags"][1] && this.props.faucetConfig.modules["passport"].overrideScores[1] > 0) {
            canStartWithScore = true;
            ipflags.push("proxy");
            if(this.props.faucetConfig.modules["passport"].overrideScores[1] > requiredScore)
              requiredScore = this.props.faucetConfig.modules["passport"].overrideScores[1];
          }
        }
        else if(sessionInfo.failedCode == "PASSPORT_SCORE" && this.props.faucetConfig.modules["passport"] && this.props.faucetConfig.modules["passport"].guestRefresh !== false) {
          requiredScore = this.props.faucetConfig.modules["passport"].overrideScores[2];
          canStartWithScore = true;
        }

        if(canStartWithScore) {
          // special case, the session is denied as the users IP is flagged as hosting/proxy range.
          // however, the faucet allows skipping this check for passport trusted wallets
          // show a dialog that shows the score & allows refreshing the passport to meet the requirement

          let errMsg: string;
          if(ipflags.length > 0) {
            errMsg = "The faucet denied starting a session because your IP Address is marked as " + ipflags.join(" and ") + " range.";
          } else {
            errMsg = "The faucet denied starting a session because your wallet does not meet the minimum passport score.";
          }

          this.props.faucetContext.showDialog({
            title: "Could not start session",
            size: "lg",
            body: (
              <div className='passport-dialog error-dialog'>
                <PassportInfo 
                  pageContext={this.props.faucetContext}
                  faucetConfig={this.props.faucetConfig}
                  targetAddr={sessionInfo.failedData["address"]}
                  refreshFn={(passportScore) => {
                    
                  }}
                >
                  <div>
                    <div className='alert alert-danger'>{errMsg}</div>
                    <div className="boost-descr">
                      You can verify your unique identity and increase your score using <a href="https://passport.gitcoin.co/#/dashboard" target="_blank">Gitcoin Passport</a>.
                    </div>
                    <div className="boost-descr2">
                      Ensure your provided address achieves a minimum score of {requiredScore} to initiate a session.
                    </div>
                  </div>
                </PassportInfo>
              </div>
            ),
            closeButton: { caption: "Close" },
          });

          throw null; // throw without dialog
        }

        throw (sessionInfo.failedCode ? "[" + sessionInfo.failedCode + "] " : "") + sessionInfo.failedReason;
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
      if(ex) {
        this.props.faucetContext.showDialog({
          title: "Could not start session",
          body: (<div className='alert alert-danger'>{ex.toString()}</div>),
          closeButton: { caption: "Close" },
        });
      }
      throw ex;
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
