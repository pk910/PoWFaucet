
import sinon from 'sinon';
import '../src/@types/global.js';
import { Worker } from "node:worker_threads";
import { FaucetProcess } from '../src/common/FaucetProcess.js';
import { ServiceManager } from '../src/common/ServiceManager.js';
import { FaucetWorkers } from '../src/common/FaucetWorker.js';
import { sleepPromise } from '../src/utils/PromiseUtils.js';
import { faucetConfig, loadFaucetConfig } from '../src/config/FaucetConfig.js';
import { FakeProvider } from './stubs/FakeProvider.js';
import { FaucetDbDriver } from '../src/db/FaucetDatabase.js';
import { PromiseDfd } from '../src/utils/PromiseDfd.js';


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
        FaucetWorkers.loadWorkerClass(classKey, channel.port2);
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
