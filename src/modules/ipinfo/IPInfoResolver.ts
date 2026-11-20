import { FetchUtil } from '../../utils/FetchUtil.js';
import { IPInfoDB } from './IPInfoDB.js';


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

export type IPInfoApiFormat = "ip-api" | "vpndetection";

export class IPInfoResolver {
  private ipInfoDb: IPInfoDB;
  private ipInfoApi: string;
  private ipInfoApiFormat: IPInfoApiFormat;
  private ipInfoCache: {[ip: string]: [number, Promise<IIPInfo>]} = {};
  private ipInfoCacheCleanupTimer: NodeJS.Timeout;
  private ipInfoCacheCleanupInterval: number = 20 * 1000;
  private ipInfoCacheCleanupTimeout: number = 6 * 60 * 60;

  public constructor(ipInfoDb: IPInfoDB, api: string, apiFormat?: IPInfoApiFormat) {
    this.ipInfoDb = ipInfoDb;
    this.ipInfoApi = api;
    this.ipInfoApiFormat = apiFormat || "ip-api";
    this.ipInfoCacheCleanupTimer = setInterval(() => {
      this.cleanIpInfoCache();
    }, this.ipInfoCacheCleanupInterval);
  }

  public dispose() {
    clearInterval(this.ipInfoCacheCleanupTimer);
  }

  public setApi(api: string, apiFormat?: IPInfoApiFormat) {
    this.ipInfoApi = api;
    this.ipInfoApiFormat = apiFormat || "ip-api";
  }

  public async getIpInfo(ipAddr: string): Promise<IIPInfo> {
    let cachedIpInfo = await this.ipInfoDb.getIPInfo(ipAddr);
    if(cachedIpInfo)
      return cachedIpInfo;
    if(this.ipInfoCache.hasOwnProperty(ipAddr))
      return await this.ipInfoCache[ipAddr][1];

    let ipApiUrl = this.ipInfoApi.replace(/{ip}/, ipAddr);
    let promise = FetchUtil.fetchWithTimeout(ipApiUrl, null, 20000)
    .then((rsp) => rsp.json())
    .then((rsp: any) => {
      if(this.ipInfoApiFormat === "vpndetection")
        rsp = this.parseVpnDetectionResponse(rsp);
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

        this.ipInfoDb.setIPInfo(ipAddr, ipInfo);
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
    return await promise;
  }

  // maps a VPNDetection answer (https://docs.vpndetection.io) to the ip-api fields used above
  private parseVpnDetectionResponse(rsp: any): any {
    if(!rsp || typeof rsp.ip !== "string")
      return null;
    let location = rsp.location || {};
    let asn = rsp.asn || {};
    let proxyFlags = ["is_vpn", "is_tor", "is_relay", "is_resproxy", "is_dcproxy", "is_mobproxy", "is_pubproxy"];
    return {
      status: "success",
      country: location.country_name,
      countryCode: location.country,
      timezone: location.timezone,
      isp: asn.name,
      org: asn.name,
      as: asn.asn ? "AS" + asn.asn + (asn.name ? " " + asn.name : "") : undefined,
      proxy: proxyFlags.some((flag) => rsp[flag] === true),
      hosting: typeof rsp.is_hosting === "boolean" ? rsp.is_hosting : undefined,
    };
  }

  private cleanIpInfoCache() {
    let now = Math.floor((new Date()).getTime() / 1000);
    Object.keys(this.ipInfoCache).forEach((ipAddr) => {
      if(now - this.ipInfoCache[ipAddr][0] > this.ipInfoCacheCleanupTimeout) {
        delete this.ipInfoCache[ipAddr];
      }
    });
  }

}
