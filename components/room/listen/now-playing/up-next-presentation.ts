export function deriveListenUpNextPreview<Item>(items: readonly Item[]) {
  return items.slice(0, 3);
}
