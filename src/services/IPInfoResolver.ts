import fetch from 'node-fetch';
import { faucetConfig } from '../common/FaucetConfig';
import { ServiceManager } from '../common/ServiceManager';
import { FaucetStoreDB } from './FaucetStoreDB';


export interface IIPInfo {
  status: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionCode?: string;
  city?: string;
  cityCode?: string;
  locLat?: number;
  locLon?: number;
  zone?: string;
  isp?: string;
  org?: string;
  as?: string;
  proxy?: boolean;
  hosting?: boolean;
}

export class IPInfoResolver {
  private ipInfoCache: {[ip: string]: [number, Promise<IIPInfo>]} = {};

  public constructor() {
    setInterval(() => {
      this.cleanIpInfoCache();
    }, 20 * 1000);
  }

  public getIpInfo(ipAddr: string): Promise<IIPInfo> {
    let cachedIpInfo = ServiceManager.GetService(FaucetStoreDB).getIPInfo(ipAddr);
    if(cachedIpInfo)
      return Promise.resolve(cachedIpInfo);
    if(this.ipInfoCache.hasOwnProperty(ipAddr))
      return this.ipInfoCache[ipAddr][1];

    let ipApiUrl = faucetConfig.ipInfoApi.replace(/{ip}/, ipAddr);
    let promise = fetch(ipApiUrl)
    .then((rsp) => rsp.json())
    .then((rsp: any) => {
      if(!rsp || !rsp.status)
        throw "invalid ip info response";
      let ipInfo: IIPInfo = {
        status: rsp.status,
      };
      if(rsp.status === "success") {
        ipInfo.country = rsp.country;
        ipInfo.countryCode = rsp.countryCode;
        ipInfo.region = rsp.regionName;
        ipInfo.regionCode = rsp.region;
        ipInfo.city = rsp.city;
        ipInfo.cityCode = rsp.zip;
        ipInfo.locLat = rsp.lat;
        ipInfo.locLon = rsp.lon;
        ipInfo.zone = rsp.timezone;
        ipInfo.isp = rsp.isp;
        ipInfo.org = rsp.org;
        ipInfo.as = rsp.as;
        ipInfo.proxy = rsp.proxy;
        ipInfo.hosting = rsp.hosting;

        ServiceManager.GetService(FaucetStoreDB).setIPInfo(ipAddr, ipInfo);
      }
      return ipInfo;
    }, (err) => {
      return {
        status: "error" + (err ? ": " + err.toString() : ""),
      };
    });

    this.ipInfoCache[ipAddr] = [
      Math.floor((new Date()).getTime() / 1000),
      promise,
    ];
    return promise;
  }

  private cleanIpInfoCache() {
    let now = Math.floor((new Date()).getTime() / 1000);
    Object.keys(this.ipInfoCache).forEach((ipAddr) => {
      if(now - this.ipInfoCache[ipAddr][0] > 6 * 60 * 60) {
        delete this.ipInfoCache[ipAddr];
      }
    });
  }

}
