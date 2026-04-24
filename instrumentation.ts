export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { runScheduler } = await import("./lib/scheduler");
  const intervalMinutes = parseInt(process.env.SCHEDULER_INTERVAL_MINUTES ?? "10", 10);

  setInterval(() => {
    runScheduler().catch((e) => console.error("[scheduler] Error:", e));
  }, intervalMinutes * 60 * 1000);

  console.log(`[scheduler] Started — every ${intervalMinutes} min`);
}
