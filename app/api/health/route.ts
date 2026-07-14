export const runtime = "nodejs";

export function GET() {
  return Response.json(
    {
      ok: true,
      service: "mistake-watch",
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
