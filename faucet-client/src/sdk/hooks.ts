/**
 * The client-side hook bus: how a module adds *logic* to the page without owning any of it.
 *
 * A hook is a named moment in the page's life. The core emits it with a payload, every handler
 * runs in registration order (a handler may be async - the emit waits), and a `before` hook may
 * throw to stop what the page was about to do; the page shows the thrown message. The names are a
 * closed list: a module registering for a name the core never emits gets a console warning rather
 * than silence, because a handler that never fires is the kind of bug nobody finds.
 */
export type FaucetHookName =
  /** the faucet config was loaded or refreshed; payload `{ config }` */
  | "config"
  /** the page's route changed; payload `{ path }` */
  | "page"
  /** a session is about to be started; payload `{ input }` - a handler may add to `input.params`, or throw to refuse */
  | "session.start"
  /** a session was started; payload `{ session }` (the session info the faucet answered with) */
  | "session.started"
  /** a running session was picked up again (page load with a stored session); payload `{ session }` */
  | "session.restored"
  /** the session's balance changed; payload `{ sessionId, balance: bigint, reason }` */
  | "session.balance"
  /** the session is about to be claimed; payload `{ sessionId, input }` - a handler may throw to refuse */
  | "session.claim"
  /** the claim request was answered; payload `{ sessionId, status }` */
  | "session.claimed"
  /** the page left a running session (stop, leave, timeout); payload `{ sessionId, status }` */
  | "session.closed"
  /** the pow miner started or stopped its workers; payload `{}` */
  | "mining.start"
  | "mining.stop";

export const FAUCET_HOOKS: FaucetHookName[] = [
  "config", "page", "session.start", "session.started", "session.restored", "session.balance",
  "session.claim", "session.claimed", "session.closed", "mining.start", "mining.stop",
];

export type FaucetHookHandler = (payload: any) => void | Promise<void>;

interface IHookRegistration {
  handler: FaucetHookHandler;
  module: string;
  prio: number;
}

let registrations: Map<string, IHookRegistration[]> = new Map();

/** Registers `handler` for `name`; lower `prio` runs first, equal prio in registration order. */
export function onHook(name: FaucetHookName, handler: FaucetHookHandler,
                       options?: { module?: string; prio?: number }): () => void {
  if(FAUCET_HOOKS.indexOf(name) === -1)
    console.warn("[PoWFaucet] '" + name + "' is not a hook the page emits; the handler will never run");
  let list = registrations.get(name);
  if(!list)
    registrations.set(name, list = []);
  let entry: IHookRegistration = { handler: handler, module: options?.module || "", prio: options?.prio ?? 100 };
  list.push(entry);
  list.sort((a, b) => a.prio - b.prio);
  return () => offHook(name, handler);
}

export function offHook(name: FaucetHookName, handler: FaucetHookHandler): void {
  let list = registrations.get(name);
  if(!list)
    return;
  registrations.set(name, list.filter((entry) => entry.handler !== handler));
}

/**
 * Runs every handler for `name`, in order, waiting for each. A handler that throws stops the chain
 * and the error reaches the emitter - which is how a `before` hook refuses. For hooks that are
 * announcements rather than questions the page catches and logs instead (`emitHookSafe`).
 */
export async function emitHook(name: FaucetHookName, payload: any): Promise<void> {
  let list = registrations.get(name);
  if(!list || list.length === 0)
    return;
  for(let entry of list.slice())
    await entry.handler(payload);
}

/** `emitHook` for announcements: a failing handler is logged with its module and never breaks the page. */
export async function emitHookSafe(name: FaucetHookName, payload: any): Promise<void> {
  let list = registrations.get(name);
  if(!list || list.length === 0)
    return;
  for(let entry of list.slice()) {
    try {
      await entry.handler(payload);
    } catch(ex) {
      console.error("[PoWFaucet] hook '" + name + "'" + (entry.module ? " of module " + entry.module : "") +
        " failed: " + (ex instanceof Error ? ex.message : ex));
    }
  }
}

export function getHookCount(name: FaucetHookName): number {
  return (registrations.get(name) || []).length;
}

export function resetHooks(): void {
  registrations = new Map();
}
