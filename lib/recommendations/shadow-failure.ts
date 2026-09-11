// Log only an operation and bounded SQL/PostgREST code, never provider payloads.
export function shadowFailureCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error))
    return "unknown";
  const code = error.code;
  return typeof code === "string" && /^[A-Z0-9]{5,12}$/.test(code)
    ? code
    : "unknown";
}
export function failShadow(
  stage: "cleanup" | "admission" | "claim" | "completion",
  error: unknown,
): never {
  console.warn("[shadow:database]", stage, shadowFailureCode(error));
  throw new Error(`Shadow ${stage} unavailable`);
}
