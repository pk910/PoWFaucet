import { default as nodeFetch, RequestInfo, RequestInit, Response } from 'node-fetch';

export class FetchUtil {
    public static fetch(
        url: RequestInfo,
        init?: RequestInit,
    ): Promise<Response> {
        return nodeFetch(url, init);
    }
}
