import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET(request: Request) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.WATCH_DESIGN_QA !== "1"
  ) {
    return new Response(null, { status: 404 });
  }
  const bytes = await readFile(
    join(process.cwd(), "tests/fixtures/media/watch-preview.webm"),
  );
  const headers = {
    "Content-Type": "video/webm",
    "Cache-Control": "no-store",
    "Accept-Ranges": "bytes",
  };
  const range = request.headers.get("range");
  if (!range)
    return new Response(bytes, {
      headers: { ...headers, "Content-Length": String(bytes.length) },
    });
  const match = /^bytes=(\d+)-(\d*)$/.exec(range);
  if (!match)
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": "bytes */" + bytes.length },
    });
  const start = Number(match[1]);
  const end = Math.min(
    match[2] ? Number(match[2]) : bytes.length - 1,
    bytes.length - 1,
  );
  if (start > end || start >= bytes.length)
    return new Response(null, { status: 416 });
  return new Response(bytes.subarray(start, end + 1), {
    status: 206,
    headers: {
      ...headers,
      "Content-Length": String(end - start + 1),
      "Content-Range": "bytes " + start + "-" + end + "/" + bytes.length,
    },
  });
}
