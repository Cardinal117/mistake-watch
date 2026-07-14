const itemCounts = [0, 24, 25, 250, 1000];
const budgets = { grid: 24, list: 12 };

const results = itemCounts.flatMap((itemCount) =>
  Object.entries(budgets).map(([viewMode, budget]) => {
    const mounted = Math.min(itemCount, budget);
    const structuralReduction =
      itemCount === 0 ? 0 : Math.round((1 - mounted / itemCount) * 1000) / 10;

    return {
      baselineMounted: itemCount,
      itemCount,
      progressiveMounted: mounted,
      structuralReductionPercent: structuralReduction,
      viewMode,
    };
  }),
);

console.table(results);

const target = results.find(
  (result) => result.itemCount === 250 && result.viewMode === "grid",
);

if (!target || target.structuralReductionPercent < 75) {
  process.exitCode = 1;
}
