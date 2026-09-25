/**
 * The test harness a faucet gives its modules' specs (moved here when a module's gate became its own).
 *
 * It was `tests/common.ts`, which was right while every module lived in this repository. A module
 * package's specs boot a real faucet - that is the point of them - and they need these stubs to do it:
 * a worker that does not fork, timers a test can wind forward, a config that starts from the defaults.
 * They cannot import a file out of this repository's `tests/` directory: a published module does not have
 * one, and after the cutover neither does a checkout of the module.
 *
 * So it lives under `src/testing/`, which is inside the SDK build's `rootDir` and therefore lands in
 * `sdk-dist/testing/` with **the same declarations as everything else there**. That last part is the
 * whole reason for the move rather than a second emit: `FaucetSession` has private members, so a session
 * from one compiled copy is not assignable to a parameter typed by another, and a spec's whole job is to
 * pass the faucet's own objects into a module. One emit, one identity.
 *
 * `tests/common.ts` re-exports this file, so this repository's own 36 suites are untouched.
 *
 * **sinon is a devDependency and this file is never on a running faucet's path**: nothing in `src/`
 * imports it, `npm run bundle` starts from `src/app.ts` and never reaches it, and the only thing that
 * loads it is a spec. It is published because a platform that ships third-party modules has to ship the
 * harness they test against, or every module author writes their own and each one is subtly wrong.
 */
import sinon from 'sinon';
import '../@types/global.js';
import { Worker } from "node:worker_threads";
import { FaucetProcess } from '../common/FaucetProcess.js';
import { ServiceManager } from '../common/ServiceManager.js';
import { FaucetWorkers } from '../common/FaucetWorker.js';
import { sleepPromise } from '../utils/PromiseUtils.js';
import { faucetConfig, loadFaucetConfig } from '../config/FaucetConfig.js';
import { FaucetDbDriver } from '../db/FaucetDatabase.js';
import { PromiseDfd } from '../utils/PromiseDfd.js';
import { IFaucetChildProcess } from '../common/FaucetWorker.js';

export function bindTestStubs(stubs?) {
  if(!stubs)
    stubs = {};
  let stubRefs = {
    "global.setTimeout": global.setTimeout,
    "global.clearTimeout": global.clearTimeout,
    "global.setInterval": global.setInterval,
    "global.clearInterval": global.clearInterval,
  };
  let stateDict = {
    timeout: [] as NodeJS.Timeout[],
    interval: [] as NodeJS.Timeout[],
  };

  let allStubs = {
    _state: stateDict,
    "FaucetWorkers.createWorker": sinon.stub(FaucetWorkers.prototype, "createWorker").callsFake((classKey) => {
      let channel = new MessageChannel();
      let worker: Worker = channel.port1 as any;
      worker.terminate = () => Promise.resolve(0);
      setTimeout(() => {
        FaucetWorkers.loadWorkerClass(classKey, channel.port2 as any);
      }, 1);
      return worker;
    }),
    "FaucetWorkers.createChildProcess": sinon.stub(FaucetWorkers.prototype, "createChildProcess").callsFake((classKey) => {
      let channel = new MessageChannel();
      let worker: IFaucetChildProcess = {
        childProcess: channel.port1 as any,
        controller: new AbortController(),
      };
      (worker.childProcess as any).send = (message: any, objs?: any) => {
        if(objs) {
          setTimeout(() => {
            (channel.port2.onmessage as any)({data: message, objs: objs} as any);
          }, 1);
        } else {
          channel.port1.postMessage(message);
        }
      };
      setTimeout(() => {
        FaucetWorkers.loadWorkerClass(classKey, channel.port2 as any);
      }, 1);
      return worker;
    }),
    "global.setTimeout": sinon.stub(global, "setTimeout").callsFake((fn, ms) => {
      let timer = stubRefs['global.setTimeout'](() => {
        fn();
        let timerIdx = stateDict.timeout.indexOf(timer);
        if(timerIdx !== -1) stateDict.timeout.splice(timerIdx, 1);
      }, ms);
      stateDict.timeout.push(timer);
      return timer;
    }),
    "global.clearTimeout": sinon.stub(global, "clearTimeout").callsFake((ti) => {
      stubRefs['global.clearTimeout'](ti);
      let timerIdx = stateDict.timeout.indexOf(ti as NodeJS.Timeout);
      if(timerIdx !== -1) stateDict.timeout.splice(timerIdx, 1);
    }),
    "global.setInterval": sinon.stub(global, "setInterval").callsFake((fn, ms) => {
      let timer = stubRefs['global.setInterval'](() => {
        fn();
        let timerIdx = stateDict.interval.indexOf(timer);
        if(timerIdx !== -1) stateDict.interval.splice(timerIdx, 1);
      }, ms);
      stateDict.interval.push(timer);
      return timer;
    }),
    "global.clearInterval": sinon.stub(global, "clearInterval").callsFake((ti) => {
      stubRefs['global.clearInterval'](ti);
      let timerIdx = stateDict.interval.indexOf(ti as NodeJS.Timeout);
      if(timerIdx !== -1) stateDict.interval.splice(timerIdx, 1);
    }),
    ...stubs,
  };
  return allStubs;
}

export async function unbindTestStubs(stubs: any) {
  let stubState: {
    timeout: NodeJS.Timeout[];
    interval: NodeJS.Timeout[];
  } = stubs._state;
  sinon.restore();
  if(stubState.timeout.length > 0) {
    stubState.timeout.forEach((timer) => clearTimeout(timer));
  }
  if(stubState.interval.length > 0) {
    stubState.interval.forEach((timer) => clearInterval(timer));
  }
}

export function loadDefaultTestConfig() {
  ServiceManager.GetService(FaucetProcess).hideLogOutput = true;
  loadFaucetConfig(true);
  faucetConfig.faucetSecret = "test";
  faucetConfig.faucetStats = null;
  faucetConfig.database = {
    driver: FaucetDbDriver.SQLITE,
    file: ":memory:",
  };
}

export async function awaitSleepPromise(timeout: number, poll: () => boolean) {
  let start = new Date().getTime();
  while(true) {
    let now = new Date().getTime();
    if(now - start >= timeout)
      return;
    if(poll())
      return;
    await sleepPromise(10);
  }
}

export function createFuse(): () => void {
  let fuseFn: any;
  fuseFn = () => {
    fuseFn._dfd.resolve();
  }
  fuseFn._dfd = new PromiseDfd<void>();
  return fuseFn;
}

export function fusedSleep(fuseFn: any, timeout?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if(fuseFn?._dfd)
      fuseFn._dfd.promise.then(resolve, reject);
    if(timeout)
      sleepPromise(timeout).then(resolve);
  });
}

export function returnDelayedPromise(resolve: boolean, result: any, delay?: number): Promise<any> {
  if(!delay)
    delay = 10;
  return new Promise((rs, rj) => {
    setTimeout(() => {
      if(resolve)
        rs(result);
      else
        rj(result);
    }, delay);
  })
}

/**
 * Poll until `check` is true or the timeout runs out; returns what `check` says at the end.
 *
 * A copy of the module's `waitFor` for the same reason as `tests/helpers/RawWsClient.ts`:
 * `PoWSocketHandover` used that module's test helpers while both suites were one tree, and a core test
 * cannot import out of a module's tests. Returning the final check rather than throwing is what
 * lets a spec say *what* was still false, which a bare timeout cannot.
 */
export async function waitFor(timeout: number, check: () => boolean): Promise<boolean> {
  let deadline = Date.now() + timeout;
  while(Date.now() < deadline) {
    if(check())
      return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return check();
}
