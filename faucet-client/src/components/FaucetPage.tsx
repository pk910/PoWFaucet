import React from 'react';
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";

import { FaucetApi } from '../common/FaucetApi';
import { IFaucetConfig, IFaucetStatus } from '../common/FaucetConfig';
import { IFaucetContext } from '../common/FaucetContext';
import { FaucetNotification } from './shared/FaucetNotification';
import { FaucetDialog, IFaucetDialogProps } from './shared/FaucetDialog';

import FrontPage from './frontpage/FrontPage';
import MiningPage from './mining/MiningPage';
import ClaimPage from './claim/ClaimPage';
import DetailsPage from './details/DetailsPage';
import FaucetStatusPage from './status/FaucetStatusPage';
import QueueStatusPage from './status/QueueStatusPage';

import './FaucetPage.css'

export interface IFaucetPageProps {
  apiUrl: string;
}

export interface IFaucetPageState {
  initializing: boolean;
  faucetConfig: IFaucetConfig;
  faucetStatus: IFaucetStatus[];
  statusAlerts: IFaucetStatusAlert[];
  dialogs: IFaucetDialog[];
  notifications: IFaucetNotification[];
}

export interface IFaucetNotification {
  id: number;
  type: string;
  message: string;
  time?: number;
  timeout?: number;
  timerId?: NodeJS.Timeout;
}

export interface IFaucetDialog {
  id: number;
  dialog: IFaucetDialogProps;
  closeFn: () => void;
}

export interface IFaucetStatusAlert {
  id: number;
  body: React.ReactElement;
  level: string;
  prio: number;
}

export const FaucetPageContext = React.createContext<IFaucetContext>(null);
export const FaucetConfigContext = React.createContext<IFaucetConfig>(null);

export class FaucetPage extends React.PureComponent<IFaucetPageProps, IFaucetPageState> {
  private configRefreshInterval: NodeJS.Timer;
  private lastConfigRefresh = 0;
  private statusAlertIdCounter = 0;
  private notificationIdCounter = 0;
  private dialogIdCounter = 0;
  private notifications: IFaucetNotification[] = [];
  private dialogs: IFaucetDialog[] = [];
  private statusAlerts: IFaucetStatusAlert[] = [];
  private pageContext: IFaucetContext;
  private faucetStatucClickCount = 0;

  constructor(props: IFaucetPageProps, state: IFaucetPageState) {
    super(props);

    let faucetApi = new FaucetApi(props.apiUrl);
    this.pageContext = {
      faucetApi: faucetApi,
      showStatusAlert: (level: string, prio: number, body: React.ReactElement) => this.showStatusAlert(level, prio, body),
      hideStatusAlert: (statusAlertId: number) => this.hideStatusAlert(statusAlertId),
      showNotification: (type: string, message: string, time?: number|boolean, timeout?: number) => this.showNotification(type, message, time, timeout),
      hideNotification: (notificationId: number) => this.hideNotification(notificationId),
      showDialog: (dialogProps: IFaucetDialogProps) => this.showDialog(dialogProps),
      hideDialog: (dialogId: number) => this.hideDialog(dialogId),
    };

    this.state = {
      initializing: true,
      faucetConfig: null,
      faucetStatus: [],
      statusAlerts: [],
      dialogs: [],
      notifications: [],
		};
  }

  public componentDidMount() {
    this.loadFaucetConfig();
    this.startConfigRefreshInterval();  
  }

  public componentWillUnmount() {
    if(this.configRefreshInterval) {
      clearInterval(this.configRefreshInterval);
      this.configRefreshInterval = null;
    }
  }

  private startConfigRefreshInterval() {
    if(this.configRefreshInterval)
      clearInterval(this.configRefreshInterval);
    this.configRefreshInterval = setInterval(() => {
      let now = (new Date()).getTime();
      if(this.lastConfigRefresh < now - (10 * 60 * 1000)) {
        this.loadFaucetConfig();
      }
    }, 30 * 1000);
  }

  private loadFaucetConfig() {
    this.pageContext.faucetApi.getFaucetConfig().then((faucetConfig) => {
      this.lastConfigRefresh = (new Date()).getTime();
      this.setState({
        initializing: false,
        faucetConfig: faucetConfig,
        faucetStatus: faucetConfig.faucetStatus,
      });
    });
  }

	public render(): React.ReactElement<IFaucetPageProps> {
    if(this.state.initializing) {
      return (
        <div className="faucet-loading">
          <div className="loading-spinner">
            <img src="/images/spinner.gif" className="spinner" />
            <span className="spinner-text">Loading...</span>
          </div>
        </div>
      );
    }
    return (
      <div className='faucet-page'>
        <FaucetConfigContext.Provider value={this.state.faucetConfig}>
          <FaucetPageContext.Provider value={this.pageContext}>
            <div className="faucet-title">
              <h1 className="center">{this.state.faucetConfig.faucetTitle}</h1>
              <div className="faucet-status-link" onClick={() => this.onFaucetStatusClick()}></div>
            </div>
            {this.renderStatusAlerts()}
            <div className="faucet-body">
              <Router>
                <Routes>
                  <Route
                    path='/'
                    element={(
                      <FrontPage />
                    )}
                  />
                  <Route
                    path='/mine/:session'
                    element={(
                      <MiningPage />
                    )}
                  />
                  <Route
                    path='/claim/:session'
                    element={(
                      <ClaimPage />
                    )}
                  />
                  <Route
                    path='/details/:session'
                    element={(
                      <DetailsPage />
                    )}
                  />
                  <Route
                    path='/status'
                    element={(
                      <FaucetStatusPage />
                    )}
                  />
                  <Route
                    path='/queue'
                    element={(
                      <QueueStatusPage />
                    )}
                  />
                </Routes>
              </Router>
            </div>
            {this.renderDialogs()}
            {this.renderNotifications()}
            <div className='faucet-footer'>
              <div className="faucet-client-version">v{FAUCET_CLIENT_VERSION}</div>
            </div>
          </FaucetPageContext.Provider>
        </FaucetConfigContext.Provider>
      </div>
    );
	}

  private renderStatusAlerts(): React.ReactElement {
    let faucetStatusEntries = [];
    Array.prototype.push.apply(faucetStatusEntries, this.state.faucetStatus);
    Array.prototype.push.apply(faucetStatusEntries, this.state.statusAlerts);
    faucetStatusEntries.sort((a, b) => (a.prio || 10) - (b.prio || 10));

    return (
      <div className="faucet-status-alerts">
        {faucetStatusEntries.map((status, idx) => {
          let faucetStatusClass: string = "";
          switch(status.level) {
            case "info":
              faucetStatusClass = "alert-info";
              break;
            case "warn":
              faucetStatusClass = "alert-warning";
              break;
            case "error":
              faucetStatusClass = "alert-danger";
              break;
            default:
              faucetStatusClass = "alert-light";
              break;
          }
          return (
            <div key={"status" + idx} className={["faucet-status-alert alert", faucetStatusClass].join(" ")} role="alert">
              {status.body ? status.body : status.ishtml ? 
                <div dangerouslySetInnerHTML={{__html: status.text}} /> :
                <span>{status.text}</span>
              }
            </div>
          );
        })}
      </div>
    );
  }

  private showStatusAlert(level: string, prio: number, body: React.ReactElement): number {
    let statusAlertId = this.statusAlertIdCounter++;
    let statusAlert: IFaucetStatusAlert = {
      id: statusAlertId,
      level: level,
      prio: prio,
      body: body,
    }
    this.statusAlerts.push(statusAlert);
    this.setState({
      statusAlerts: this.statusAlerts.slice()
    })
    return statusAlertId;
  }

  private hideStatusAlert(statusAlertId: number): void {
    let statusAlertIdx = -1;
    let statusAlert: IFaucetStatusAlert;
    for(let idx = 0; idx < this.state.statusAlerts.length; idx++) {
      if(this.statusAlerts[idx].id === statusAlertId) {
        statusAlertIdx = idx;
        statusAlert = this.state.statusAlerts[idx];
        break;
      }
    }
    if(statusAlertIdx !== -1) {
      this.statusAlerts.splice(statusAlertIdx, 1);
      this.setState({
        statusAlerts: this.statusAlerts.slice()
      });
    }
  }

  private renderNotifications(): React.ReactElement {
    return (
      <div className='faucet-notifications'>
        {this.state.notifications.map((notification) => (
          <FaucetNotification 
            key={notification.id} 
            type={notification.type} 
            message={notification.message} 
            time={notification.time} 
            hideFn={() => this.hideNotification(notification.id)} 
          />
        ))}
      </div>
    );
  }

  private showNotification(type: string, message: string, time?: number|boolean, timeout?: number): number {
    let notificationId = this.notificationIdCounter++;
    let notification: IFaucetNotification = {
      id: notificationId,
      type: type,
      message: message,
      time: typeof time == "number" ? time : time ? (new Date()).getTime() : null,
      timeout: timeout ? (new Date()).getTime() + timeout : 0,
      timerId: timeout ? setTimeout(() => {
        notification.timerId = null;
        this.hideNotification(notification.id);
      }, timeout) : null,
    }
    if(this.notifications.length > 10) {
      this.notifications.splice(0, this.notifications.length - 10).forEach((n) => {
        if(n.timerId) {
          clearTimeout(n.timerId);
          n.timerId = null;
        }
      });
    }
    this.notifications.push(notification);
    this.setState({
      notifications: this.notifications.slice()
    })
    return notificationId;
  }

  private hideNotification(notificationId: number): void {
    let notificationIdx = -1;
    let notification: IFaucetNotification;
    for(let idx = 0; idx < this.state.notifications.length; idx++) {
      if(this.notifications[idx].id === notificationId) {
        notificationIdx = idx;
        notification = this.state.notifications[idx];
        break;
      }
    }
    if(notificationIdx !== -1) {
      if(notification.timerId) {
        clearTimeout(notification.timerId);
        notification.timerId = null;
      }

      this.notifications.splice(notificationIdx, 1);
      this.setState({
        notifications: this.notifications.slice()
      });
    }
  }

  private renderDialogs(): React.ReactElement[] {
    return this.state.dialogs.map((dialog) => (
      <FaucetDialog 
        key={dialog.id} 
        {...dialog.dialog}
      />
    ));
  }

  private showDialog(dialogProps: IFaucetDialogProps): number {
    let dialogId = this.dialogIdCounter++;
    let dialog: IFaucetDialog = {
      id: dialogId,
      dialog: {
        ...dialogProps,
        closeFn: () => this.hideDialog(dialogId),
      },
      closeFn: dialogProps.closeFn,
    }
    this.dialogs.push(dialog);
    this.setState({
      dialogs: this.dialogs.slice()
    })
    return dialogId;
  }

  private hideDialog(dialogId: number): void {
    let dialogIdx = -1;
    let dialog: IFaucetDialog;
    for(let idx = 0; idx < this.dialogs.length; idx++) {
      if(this.dialogs[idx].id === dialogId) {
        dialogIdx = idx;
        dialog = this.dialogs[idx];
        break;
      }
    }
    if(dialog && dialogIdx !== -1) {
      if(dialog.closeFn)
        dialog.closeFn();
      this.dialogs.splice(dialogIdx, 1);
      this.setState({
        dialogs: this.dialogs.slice()
      });
    }
  }

  private onFaucetStatusClick() {
    this.faucetStatucClickCount++;
    if(this.faucetStatucClickCount >= 10) {
      this.faucetStatucClickCount = 0;
      location.href = "#/status";
    }
  }

}
