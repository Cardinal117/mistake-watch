export type SpacetimeConfig = {
  databaseName: string;
  uri: string;
};

const DEFAULT_SPACETIME_URI = "ws://127.0.0.1:5372";
const DEFAULT_SPACETIME_MODULE = "mistake-watch-rooms";

export function getSpacetimeConfig(): SpacetimeConfig {
  return {
    databaseName:
      process.env.NEXT_PUBLIC_SPACETIME_MODULE ?? DEFAULT_SPACETIME_MODULE,
    uri: process.env.NEXT_PUBLIC_SPACETIME_URI ?? DEFAULT_SPACETIME_URI,
  };
}
