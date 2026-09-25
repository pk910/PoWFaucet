import { ServiceManager } from "../common/ServiceManager.js";
import { FaucetSession, FaucetSessionStatus } from "../session/FaucetSession.js";
import { SessionManager } from "../session/SessionManager.js";

/**
 * Look a session up by id - the one thing a module needs `SessionManager` for.
 *
 * `PLAN_PLUGIN_ARCHITECTURE`'s surface list deliberately leaves `SessionManager` out: it owns
 * creation, expiry and persistence, and a module holding it could drive all three. But a module
 * that serves a socket of its own is handed a session *id* by the client and has no way to turn it
 * into a session, which the module split made concrete - a module serving its own websocket does exactly that
 * and nothing else (`getSession(id, [RUNNING])`, one call).
 *
 * So the accessor is the surface and the manager is not. A module can read the session it was told
 * about; it cannot enumerate sessions, create one or end one.
 */
export function getSession(sessionId: string, statuses?: FaucetSessionStatus[]): FaucetSession {
  return ServiceManager.GetService(SessionManager).getSession(sessionId, statuses);
}
