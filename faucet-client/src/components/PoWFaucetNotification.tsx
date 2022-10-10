import React, { ReactElement } from 'react';
import { renderTime } from '../utils/DateUtils';

export interface IPoWFaucetNotificationProps {
  type: string;
  message: string;
  time: number;
  hideFn?: () => void,
}

export interface IPoWFaucetNotificationState {
}

export class PoWFaucetNotification extends React.PureComponent<IPoWFaucetNotificationProps, IPoWFaucetNotificationState> {

  constructor(props: IPoWFaucetNotificationProps, state: IPoWFaucetNotificationState) {
    super(props);

    this.state = {};
  }

	public render(): React.ReactElement<IPoWFaucetNotificationProps> {
    let alertClass: string[] = [ "alert" ];
    switch(this.props.type) {
      case "success":
        alertClass.push("alert-success");
        break;
      case "error":
        alertClass.push("alert-danger");
        break;
      case "warning":
        alertClass.push("alert-warning");
        break;
      case "info":
        alertClass.push("alert-info");
        break;
    }

    return (
      <div className="pow-notification" onClick={() => this.props.hideFn ? this.props.hideFn() : null}>
        <div className={alertClass.join(" ")} role="alert">
          {this.props.time ? renderTime(new Date(this.props.time), true) + " - " : ""}
          {this.props.message}
        </div>
      </div>
    );
	}

}
