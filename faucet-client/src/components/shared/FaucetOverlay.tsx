import React, { useContext } from 'react';
import { OverlayTrigger, OverlayTriggerProps } from 'react-bootstrap';
import { FaucetPageContext } from '../FaucetPage';

export type IFaucetOverlayProps = Omit<OverlayTriggerProps, 'container'>;

/**
 * The one way to open a tooltip or popover in the faucet.
 *
 * Two things every overlay here needs, and that react-bootstrap's OverlayTrigger leaves to the
 * caller: it has to render inside the faucet's own element, because the stylesheet is scoped to
 * it and an overlay in document.body comes out as bare text; and it must not take part in the
 * page's layout, which Popper's `fixed` strategy guarantees - a fixed element never adds
 * scrollable overflow, so a callout at the bottom edge cannot flip the scrollbar and move a
 * vertically centred page. `tests/client/OverlayConvention.spec.ts` fails the build when a
 * component reaches for OverlayTrigger directly.
 */
export function FaucetOverlay(props: IFaucetOverlayProps): React.ReactElement {
  let context = useContext(FaucetPageContext);
  let popperConfig = Object.assign({}, props.popperConfig || {}, { strategy: "fixed" as const });
  return (
    <OverlayTrigger
      {...props}
      container={() => context ? context.getContainer() : undefined}
      popperConfig={popperConfig}
    />
  );
}
