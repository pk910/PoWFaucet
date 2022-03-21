
export interface IPromiseFns {
  resolve(result?: any): void;
  reject(error?: any): void;
}

export class PromiseDfd<T> {
  public readonly promise: Promise<T>;
  public readonly resolve: (result?: T) => void;
  public readonly reject: (error?: any) => void;
  
  public constructor() {
    let promiseFns: IPromiseFns;
    this.promise = new Promise((resolve, reject) => {
      promiseFns = {
        resolve: resolve,
        reject: reject
      };
    });
    this.resolve = promiseFns.resolve;
    this.reject = promiseFns.reject;

  }
}
