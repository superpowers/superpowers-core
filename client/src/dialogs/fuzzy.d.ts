declare module "fuzzy" {
  export function filter(value: string, list: string[]): { original: string; index: number; score: number }[];
}
