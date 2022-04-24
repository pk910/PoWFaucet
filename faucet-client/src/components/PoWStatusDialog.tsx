import React, { ReactElement } from 'react';
import { Button, Modal } from 'react-bootstrap';

export interface IPoWStatusDialogProps {
  title: string;
  body: ReactElement;
  closeButton?: {
    caption: string;
  },
  applyButton?: {
    caption: string;
    applyFn: () => void,
  },
  closeFn?: () => void,
}

export interface IPoWStatusDialogState {
}

export class PoWStatusDialog extends React.PureComponent<IPoWStatusDialogProps, IPoWStatusDialogState> {

  constructor(props: IPoWStatusDialogProps, state: IPoWStatusDialogState) {
    super(props);

    this.state = {};
  }

	public render(): React.ReactElement<IPoWStatusDialogProps> {
    return (
      <Modal show centered className="pow-captcha-modal" onHide={() => {
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
            <Button onClick={() => {
              this.props.applyButton.applyFn();
              if(this.props.closeFn)
                this.props.closeFn();
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
