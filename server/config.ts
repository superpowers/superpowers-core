export interface Config {
  serverName?: string;
  mainPort: number;
  buildPort: number;
  password: string;
  sessionSecret: string;
  maxRecentBuilds: number;
  [key: string]: any;
}

export const defaults: Config = {
  serverName: null,
  mainPort: 4237,
  buildPort: 4238,
  password: "",
  sessionSecret: null,
  maxRecentBuilds: 10
};

// Loaded by start.ts
export let server: Config = null;

export function setServerConfig(serverConfig: Config) {
  server = serverConfig;
}
