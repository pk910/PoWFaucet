import { default as nodeFetch, RequestInfo, RequestInit, Response } from 'node-fetch';

export class FetchUtil {
    public static fetch(
        url: RequestInfo,
        init?: RequestInit,
    ): Promise<Response> {
        if(init)
            return nodeFetch(url, init);
        else
            return nodeFetch(url);
    }

    public static fetchWithTimeout(
        url: RequestInfo,
        init?: RequestInit,
        timeout: number = 5000,
    ): Promise<Response> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Request timed out'));
            }, timeout);

            FetchUtil.fetch(url, init).then((res) => {
                clearTimeout(timeoutId);
                resolve(res);
            }).catch((err) => {
                clearTimeout(timeoutId);
                reject(err);
            });
        });
    }
}
