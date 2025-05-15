import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { IFaucetConfig } from '../../../common/FaucetConfig';
import { IFaucetContext } from '../../../common/FaucetContext';
import { OverlayTrigger, Popover, Form, Row, Col } from 'react-bootstrap'; // Assuming react-bootstrap is available

export interface IVoucherInputProps {
  faucetContext: IFaucetContext;
  faucetConfig: IFaucetConfig;
}

export interface IVoucherInputRef {
  getCode(): string | undefined;
}

const VoucherInput = forwardRef<IVoucherInputRef, IVoucherInputProps>((props, ref) => {
  const [voucherCode, setVoucherCode] = useState<string>('');
  const voucherConfig = props.faucetConfig.modules.voucher;

  useImperativeHandle(ref, () => ({
    getCode: () => voucherCode || undefined,
  }));

  if (!voucherConfig) {
    return null; // Should not happen if rendered conditionally
  }

  const infoPopover = voucherConfig.infoHtml ? (
    <Popover id="popover-voucher-info">
      <Popover.Body>
        <div dangerouslySetInnerHTML={{ __html: voucherConfig.infoHtml }} />
      </Popover.Body>
    </Popover>
  ) : null;

  return (
    <div className="voucher-input-container my-3">
      <Form.Group as={Row} controlId="voucherCodeInput" className="align-items-center">
        {voucherConfig.voucherLabel && (
          <Form.Label column sm="auto" className="mb-0">
            {voucherConfig.voucherLabel}
            {infoPopover && (
              <OverlayTrigger trigger={['hover', 'focus']} placement="right" overlay={infoPopover}>
                <span className="info-icon ms-1" style={{ cursor: 'pointer' }}>
                  &#9432; {/* Unicode INFO symbol */}
                </span>
              </OverlayTrigger>
            )}
          </Form.Label>
        )}
        <Col>
          <Form.Control
            type="text"
            placeholder="Enter Voucher Code"
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value)}
            style={{ fontFamily: 'monospace' }}
          />
        </Col>
      </Form.Group>
    </div>
  );
});

export default VoucherInput; 