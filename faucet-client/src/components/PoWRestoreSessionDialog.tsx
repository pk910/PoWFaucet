import { PoWSession } from 'common/PoWSession';
import React, { ReactElement } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { weiToEth } from '../utils/ConvertHelpers';
import { renderDate } from '../utils/DateUtils';

export interface IPoWRestoreSessionDialogProps {
  powSession: PoWSession,
  closeFn: () => void,
}

export interface IPoWRestoreSessionDialogState {
}

export class PoWRestoreSessionDialog extends React.PureComponent<IPoWRestoreSessionDialogProps, IPoWRestoreSessionDialogState> {

  constructor(props: IPoWRestoreSessionDialogProps, state: IPoWRestoreSessionDialogState) {
    super(props);

    this.state = {};
  }

	public render(): React.ReactElement<IPoWRestoreSessionDialogProps> {
    let storedSessionInfo = this.props.powSession.getStoredSessionInfo();
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
                {Math.round(weiToEth(storedSessionInfo.balance) * 100) / 100} ETH
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => {
            this.props.powSession.restoreStoredSession();
            this.props.closeFn();
          }}>Continue previous session</Button>
          <Button onClick={() => {
            this.props.closeFn();
          }}>Start new session</Button>
        </Modal.Footer>
      </Modal>
    );
	}

}
