import "server-only";

// Explicit owner-requested copy preference, keyed to a verified account.
export function personalFeedbackStyle(
  accountId: string,
): "af-casual" | undefined {
  return accountId === "de56d1dc-8e3d-46df-b357-a5eca4dbd2dd"
    ? "af-casual"
    : undefined;
}
