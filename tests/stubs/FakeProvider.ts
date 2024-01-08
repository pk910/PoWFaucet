import { TypedEmitter } from 'tiny-typed-emitter';
import { EthExecutionAPI, JsonRpcResponseWithResult, MethodNotImplementedError, Web3APIMethod, Web3APIPayload, Web3APIReturnType, Web3APISpec, Web3BaseProvider, Web3ProviderStatus } from 'web3';

export class FakeProvider<
API extends Web3APISpec = EthExecutionAPI,
> extends Web3BaseProvider<API> {

  private idCounter = 1;
  private responseDict: {
    [method: string]: any
  } = {};
  private requestDict: {
    [method: string]: any[]
  } = {};


  public injectResponse(method: string, response: any) {
    this.responseDict[method] = response;
  }

  private getLastRequest(method: string): any {
    let methodCalls;
    if(!(methodCalls = this.requestDict[method]))
      return null;
    return methodCalls[methodCalls.length - 1];
  }

  private getResponses(payloads) {
    return payloads.map((payload) => this.getResponse(payload));
  }

  private getResponse(payload) {
    if(!this.requestDict[payload.method])
      this.requestDict[payload.method] = [ payload ];
    else
      this.requestDict[payload.method].push(payload);
    //console.log("payload", JSON.stringify(payload, null, 2));
    let rsp = this.responseDict[payload.method];
    if(!rsp) {
      console.log("no mock for request: ", payload);
    }
    let rspStub;
    try {
      if(typeof rsp === "function")
        rsp = rsp(payload);
      rspStub = {
        jsonrpc: '2.0',
        id: payload.id || this.idCounter++,
        result: rsp
      };
      if(rsp && (rsp._return || rsp._throw)) {
        rspStub = rsp;
      }
    } catch(ex) {
      rspStub = {
        jsonrpc: '2.0',
        id: payload.id || this.idCounter++,
        error: {
          code: 1234,
          message: 'Stub error: ' + ex?.toString()
        }
      };
    }
    if(rspStub && rspStub._throw) {
      throw rspStub._throw;
    }
    return rspStub;
  }

  /* eslint-disable class-methods-use-this */
	public getStatus(): Web3ProviderStatus {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public supportsSubscriptions() {
		return false;
	}

	public async request<
		Method extends Web3APIMethod<API>,
		ResultType = Web3APIReturnType<API, Method>,
	>(
		payload: Web3APIPayload<API, Method>,
		requestOptions?: RequestInit,
	): Promise<JsonRpcResponseWithResult<ResultType>> {
		
    //console.log("stub.request", payload)
    let response;
    if(Array.isArray(payload))
      response = this.getResponses(payload);
    else
      response = this.getResponse(payload);

		return response as JsonRpcResponseWithResult<ResultType>;
	}

	/* eslint-disable class-methods-use-this */
	public on() {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public removeListener() {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public once() {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public removeAllListeners() {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public connect() {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public disconnect() {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public reset() {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public reconnect() {
		throw new MethodNotImplementedError();
	}
}
