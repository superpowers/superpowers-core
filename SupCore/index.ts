/// <reference path="../typings/tsd.d.ts" />

import * as data from "./data/index";
export { data };

export function log(message: string): void {
  let text = `${new Date().toISOString()} - ${message}`;
  console.log(text);

  if (process != null && process.send != null) process.send(text);
  return;
}
