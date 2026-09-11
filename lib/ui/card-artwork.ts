/** Use YouTube's widescreen thumbnail for square cover crops, not its padded 4:3 preview. */
export function cardArtworkUrl(url: string): string {
  return url.replace(
    /^(https:\/\/(?:i\.ytimg\.com|img\.youtube\.com)\/vi\/[\w-]{11}\/)(?:default|hqdefault|sddefault)\.jpg$/,
    "$1mqdefault.jpg",
  );
}
