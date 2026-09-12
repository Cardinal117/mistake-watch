export type LatestPlayRequest = {
  isCurrent(): boolean;
};

export function createLatestPlayRequestCoordinator() {
  let generation = 0;
  let active = true;

  return {
    activate() {
      active = true;
    },
    begin(externalIsCurrent?: () => boolean): LatestPlayRequest {
      const requestGeneration = ++generation;
      return {
        isCurrent: () =>
          active &&
          requestGeneration === generation &&
          externalIsCurrent?.() !== false,
      };
    },
    invalidate() {
      generation += 1;
    },
    dispose() {
      active = false;
      generation += 1;
    },
  };
}

export async function commitLatestPlayAdmission<T>(
  request: LatestPlayRequest,
  admission: Promise<T>,
  commit: (admitted: T) => void | Promise<void>,
) {
  const admitted = await admission;
  if (!request.isCurrent()) return false;
  await commit(admitted);
  return true;
}
