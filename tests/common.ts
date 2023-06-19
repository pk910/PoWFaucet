
import sinon from 'sinon';
import { Worker } from "node:worker_threads";
import { FaucetProcess } from '../src/common/FaucetProcess';
import { ServiceManager } from '../src/common/ServiceManager';
import { FaucetWorkers } from '../src/common/FaucetWorker';
import { sleepPromise } from '../src/utils/SleepPromise';
import { faucetConfig, loadFaucetConfig } from '../src/config/FaucetConfig';
import { FakeProvider } from './stubs/FakeProvider';


export function bindTestStubs(stubs?) {
  if(!stubs)
    stubs = {};
  return {
    "FaucetWorkers.createWorker": sinon.stub(FaucetWorkers.prototype, "createWorker").callsFake((classKey) => {
      let channel = new MessageChannel();
      let worker: Worker = channel.port1 as any;
      worker.terminate = () => Promise.resolve(0);
      setTimeout(() => {
        FaucetWorkers.loadWorkerClass(classKey, channel.port2);
      }, 1);
      return worker;
    }),
    ...stubs,
  }
}

export async function unbindTestStubs() {
  sinon.restore();
}

export function loadDefaultTestConfig() {
  ServiceManager.GetService(FaucetProcess).hideLogOutput = true;
  loadFaucetConfig(true);
  faucetConfig.faucetSecret = "test";
  faucetConfig.faucetStats = null;
  faucetConfig.database.driver = "sqlite";
  faucetConfig.database.file = ":memory:";

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
