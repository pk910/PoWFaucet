import { OutgoingHttpHeaders } from "http2";

const RESPONSES = {
  200: "OK",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  500: "Internal Server Error",
};

export class FaucetHttpResponse {
  public readonly code: number;
  public readonly reason: string;
  public readonly body?: string;
  public readonly headers?: OutgoingHttpHeaders;

  public constructor(
    code: keyof typeof RESPONSES,
    body?: string,
    headers?: OutgoingHttpHeaders
  ) {
    this.code = code;
    this.reason = RESPONSES[code];
    this.body = body;
    this.headers = headers;
  }
}
