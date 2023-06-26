
export class ServiceManager {
  private static _serviceSymbol = (globalThis.Symbol ? Symbol("ServiceInstances") : "__SvcInstances");
  private static _serviceClasses: object[] = [];
  private static _serviceInstances: object[][][] = [];

  private static GetServiceIdx<SvcT extends object, SvcP = any>(serviceClass: new(props: SvcP) => SvcT): number {
    let serviceIdx: number;

    if(serviceClass.hasOwnProperty(this._serviceSymbol))
      serviceIdx = serviceClass[this._serviceSymbol];
    else {
      serviceIdx = this._serviceClasses.length;
      Object.defineProperty(serviceClass, this._serviceSymbol, {
        value: serviceIdx,
        writable: false
      });
      this._serviceClasses.push(serviceClass);
      this._serviceInstances.push([]);
    }

    return serviceIdx;
  }

  private static GetServiceObj(serviceIdx: number, identObj: object): object {
    let objListLen = this._serviceInstances[serviceIdx].length;
    for(let idx = 0; idx < objListLen; idx++) {
      if(this._serviceInstances[serviceIdx][idx][0] === identObj)
        return this._serviceInstances[serviceIdx][idx][1];
    }
    return null;
  }

  private static AddServiceObj(serviceIdx: number, identObj: object, serviceObj: object) {
    this._serviceInstances[serviceIdx].push([
      identObj,
      serviceObj
    ]);
  }

  public static InitService<SvcT extends object, SvcP = any>(serviceClass: new(props: SvcP) => SvcT, serviceProps: SvcP = null, serviceIdent: object = undefined): SvcT {
    if(!serviceClass)
      return null;
    if(serviceIdent === undefined)
      serviceIdent = null;

    let serviceIdx = this.GetServiceIdx(serviceClass);
    let serviceObj = this.GetServiceObj(serviceIdx, serviceIdent) as SvcT;
    if(serviceObj)
      throw "Service already initialized";
    
    serviceObj = new serviceClass(serviceProps);
    if(!(serviceObj instanceof serviceClass))
      throw "ServiceLoader found object that is not an instance of the requested service";

    this.AddServiceObj(serviceIdx, serviceIdent, serviceObj);
    return serviceObj;
  }

  public static GetService<SvcT extends object, SvcP = any>(serviceClass: new(props: SvcP) => SvcT, serviceProps: SvcP = null, serviceIdent: object = undefined): SvcT {
    if(!serviceClass)
      return null;
    if(serviceIdent === undefined)
      serviceIdent = serviceProps as any;

    let serviceIdx = this.GetServiceIdx(serviceClass);
    let serviceObj = this.GetServiceObj(serviceIdx, serviceIdent) as SvcT;
    if(!serviceObj) {
      serviceObj = new serviceClass(serviceProps);
      this.AddServiceObj(serviceIdx, serviceIdent, serviceObj);
    }

    if(!(serviceObj instanceof serviceClass))
      throw "ServiceLoader found object that is not an instance of the requested service";

    return serviceObj;
  }

  public static DisposeAllServices(): Promise<void> {
    let promises: Promise<void>[] = [];
    this._serviceInstances.forEach((instanceArr) => {
      if(instanceArr.length > 0) {
        instanceArr.forEach((instance) => {
          if(typeof (instance[1] as any).dispose === "function") {
            promises.push((instance[1] as any).dispose());
          }
        });
        instanceArr.splice(0, instanceArr.length);
      }
    });
    return Promise.all(promises).then();
  }

}
