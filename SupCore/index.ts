///<reference path = "typings/tsd.d.ts"/>

export import data = require("./data/index");

export function log(message: string) {
  var text = `${new Date().toISOString() } - ${message}`;
  console.log(text);

  if (process != null && process.send != null) process.send(text);
  return;
}
