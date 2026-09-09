type CleanupJob = { room_id: string; purge: boolean };
export async function runRoomCleanup(dependencies: {
  pending(): Promise<CleanupJob[]>;
  retire(roomId: string, purge: boolean): Promise<void>;
  finish(roomId: string, purge: boolean): Promise<boolean>;
}) {
  let completed = 0,
    failed = 0;
  const jobs = await dependencies.pending();
  for (const job of jobs) {
    try {
      await dependencies.retire(job.room_id, job.purge);
      if (!(await dependencies.finish(job.room_id, job.purge)))
        throw new Error("Cleanup acknowledgement rejected");
      completed++;
    } catch {
      failed++;
    }
  }
  return { completed, failed };
}
