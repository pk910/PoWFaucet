import { IFaucetConfig } from '../common/IFaucetConfig';
import { IPoWSessionInfo, PoWSession } from '../common/PoWSession';
import React from 'react';
import { Button, Modal } from 'react-bootstrap';
import { toReadableAmount } from '../utils/ConvertHelpers';
import { renderDate } from '../utils/DateUtils';
import { IPoWStatusDialogProps } from './PoWStatusDialog';

export interface IPoWRestoreSessionDialogProps {
  powSession: PoWSession;
  faucetConfig: IFaucetConfig;
  closeFn: () => void;
  restoreFn: (sessionInfo: IPoWSessionInfo) => Promise<void>;
  setDialog: (dialog: IPoWStatusDialogProps) => void;
}

export interface IPoWRestoreSessionDialogState {
}

export class PoWRestoreSessionDialog extends React.PureComponent<IPoWRestoreSessionDialogProps, IPoWRestoreSessionDialogState> {

  constructor(props: IPoWRestoreSessionDialogProps, state: IPoWRestoreSessionDialogState) {
    super(props);

    this.state = {};
  }

	public render(): React.ReactElement<IPoWRestoreSessionDialogProps> {
    let storedSessionInfo = this.props.powSession.getStoredSessionInfo(this.props.faucetConfig);
    return (
      <Modal show centered size="lg" className="pow-captcha-modal" onHide={() => this.props.closeFn()}>
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
            Continue mining on previous session?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='container'>
            <div className='row'>
              <div className='col'>
                Do you want to continue mining on your previous session?
              </div>
            </div>
            <div className='row'>
              <div className='col-3'>
                Address:
              </div>
              <div className='col'>
                {storedSessionInfo.targetAddr}
              </div>
            </div>
            <div className='row'>
              <div className='col-3'>
                Start Time:
              </div>
              <div className='col'>
                {renderDate(new Date(storedSessionInfo.startTime * 1000), true)}
              </div>
            </div>
            <div className='row'>
              <div className='col-3'>
                Balance:
              </div>
              <div className='col'>
                {toReadableAmount(storedSessionInfo.balance, this.props.faucetConfig.faucetCoinDecimals, this.props.faucetConfig.faucetCoinSymbol)}
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => {
            let sessionInfo = this.props.powSession.getStoredSessionInfo(this.props.faucetConfig);
            this.props.restoreFn(sessionInfo).then(() => {
              this.props.closeFn();
            }, (err) => {
              this.props.setDialog({
                title: "Could not restore session.",
                body: (
                  <div className='altert alert-danger'>
                    {(err && err.message ? err.message : err)}
                  </div>
                ),
                closeButton: {
                  caption: "Close"
                }
              });
            });
            
          }}>Continue previous session</Button>
          <Button onClick={() => {
            this.props.closeFn();
          }}>Start new session</Button>
        </Modal.Footer>
      </Modal>
    );
	}

}
