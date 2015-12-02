/// <reference path="../typings/tsd.d.ts" />

/* tslint:disable:no-unused-variable */
import * as Data from "./Data";
/* tslint:enable:no-unused-variable */
export { Data };

export * from "./systems";

export function log(message: string): void {
  let date = new Date();
  let text = `${date.toLocaleDateString()} ${date.toLocaleTimeString()} - ${message}`;
  console.log(text);

  if (process != null && process.send != null) process.send(text);
  return;
}

export let languages: { [value: string]: string; } = {
  "none": "None",
  "en": "English",
  "fr": "Français"
};
