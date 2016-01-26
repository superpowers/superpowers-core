export interface Config {
  mainPort: number;
  buildPort: number;
  password: string;
  maxRecentBuilds: number;
  [key: string]: any;
}

export const defaults: Config = {
  mainPort: 4237,
  buildPort: 4238,
  password: "",
  maxRecentBuilds: 10
};

// Loaded by start.ts
export let server: Config = null;
