import { OpenAPI } from "@defuse-protocol/one-click-sdk-typescript";

export const client = {
  init(opts?: { baseUrl?: string; token?: string }) {
    OpenAPI.BASE = opts?.baseUrl ?? "https://1click.chaindefuser.com";
    if (opts?.token) {
      OpenAPI.TOKEN = opts.token;
    }
  },
};
