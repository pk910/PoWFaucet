import React from 'react';
import { IFaucetConfig } from '../common/FaucetConfig';
import { FaucetSlotName, getSlot } from './slots';

export interface ISlotOutletProps {
  slot: FaucetSlotName;
  faucetConfig: IFaucetConfig;
  sessionId?: string | null;
  navigate: (path: string) => void;
}

/**
 * Renders whatever modules registered for one slot, in their order, each with its own config
 * block. Nothing registered renders nothing - the page is the page it was before any module.
 */
export function SlotOutlet(props: ISlotOutletProps): React.ReactElement | null {
  let entries = getSlot(props.slot);
  if(entries.length === 0)
    return null;
  return (
    <div className={"faucet-slot faucet-slot-" + props.slot.replace(/\./g, "-")}>
      {entries.map((entry, idx) => {
        let Component = entry.component;
        let modules = (props.faucetConfig && props.faucetConfig.modules) || {};
        let moduleConfig = modules[entry.module] === undefined ? null : modules[entry.module];
        return (
          <Component
            key={entry.module + ":" + idx}
            sessionId={props.sessionId || null}
            faucetConfig={props.faucetConfig}
            moduleConfig={moduleConfig}
            moduleName={entry.module}
            navigate={props.navigate}
          />
        );
      })}
    </div>
  );
}
