/// <reference path="../typings/tsd.d.ts" />

import * as Data from "./Data";
export { Data };


import HotKeyMgr from "./HotKeyMgr";

if (typeof window === "object") {
  if (window === window.top) {
    this.hotKeyMgr = new HotKeyMgr();
  } else {
    this.hotKeyMgr = (<any>window).top.SupCore.hotKeyMgr;
  }
}




export * from "./systems";

export function log(message: string): void {
  const date = new Date();
  const text = `${date.toLocaleDateString()} ${date.toLocaleTimeString()} - ${message}`;
  console.log(text);
  return;
}

export class LocalizedError {
  constructor(public key: string, public variables: { [key: string]: string; }) {}
}
