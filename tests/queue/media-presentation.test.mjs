import assert from "node:assert/strict";
import test from "node:test";
import { artistLabel } from "../../lib/ui/artist-label.ts";
import { cardArtworkUrl } from "../../lib/ui/card-artwork.ts";

test("artist presentation removes only the trailing provider Topic suffix", () => {
  assert.equal(artistLabel("Rok Nardin - Topic"), "Rok Nardin");
  assert.equal(artistLabel("Topic"), "Topic");
  assert.equal(artistLabel("Topic - A collaboration"), "Topic - A collaboration");
  assert.equal(artistLabel(undefined), "");
  const source = { artist: "Rok Nardin - Topic" };
  artistLabel(source.artist);
  assert.equal(source.artist, "Rok Nardin - Topic");
});
test("cover thumbnail selection changes only known padded YouTube variants", () => {
  assert.equal(cardArtworkUrl("https://i.ytimg.com/vi/vlrN8Mso-6Y/hqdefault.jpg"), "https://i.ytimg.com/vi/vlrN8Mso-6Y/mqdefault.jpg");
  for (const url of ["https://i.ytimg.com/vi/vlrN8Mso-6Y/maxresdefault.jpg", "https://other.example/vi/vlrN8Mso-6Y/hqdefault.jpg", "data:image/svg+xml,example"]) assert.equal(cardArtworkUrl(url), url);
});
