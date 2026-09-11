/** Presentation only: keep the provider's original channel name in stored data. */
export function artistLabel(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+- Topic\s*$/, "");
}
