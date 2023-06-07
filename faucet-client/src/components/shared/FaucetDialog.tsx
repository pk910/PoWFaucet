import React, { ReactElement } from 'react';
import { Button, Modal } from 'react-bootstrap';

export interface IFaucetDialogProps {
  title: string;
  body: ReactElement;
  size?: string;
  closeButton?: {
    caption: string;
  },
  applyButton?: {
    caption: string;
    applyFn: () => void,
  },
  closeFn?: () => void,
}

export interface IFaucetDialogState {
}

export class FaucetDialog extends React.PureComponent<IFaucetDialogProps, IFaucetDialogState> {

  constructor(props: IFaucetDialogProps, state: IFaucetDialogState) {
    super(props);

    this.state = {};
  }

	public render(): React.ReactElement<IFaucetDialogProps> {
    return (
      <Modal show centered className="faucet-dialog" size={(this.props.size || undefined) as any} onHide={() => {
        if(this.props.closeFn)
          this.props.closeFn();
      }}>
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
            {this.props.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.props.body}
        </Modal.Body>
        <Modal.Footer>
          {this.props.applyButton ? 
            <Button onClick={async () => {
              try {
                await this.props.applyButton.applyFn();
                if(this.props.closeFn)
                  this.props.closeFn();
              } catch(ex) {}
            }}>{this.props.applyButton.caption}</Button>
          : null}
          {this.props.closeButton ? 
            <Button onClick={() => {
              if(this.props.closeFn)
                this.props.closeFn();
            }}>{this.props.closeButton.caption}</Button>
          : null}
        </Modal.Footer>
      </Modal>
    );
	}

}
