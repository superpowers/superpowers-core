import * as Data from "./Data";

export { Data };

export let systemsPath: string;

export function setSystemsPath(path: string) {
  systemsPath = path;
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
