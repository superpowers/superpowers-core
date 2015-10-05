declare module 'fuzzy' {
  function filter(value: string, list: string[]): { original: string; index: number; score: number }[];
}
