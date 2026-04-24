export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const cron = await import("node-cron");
  const { runScheduler } = await import("./lib/scheduler");

  const schedule = process.env.SCHEDULER_CRON ?? "*/10 * * * *"; // every 10 min by default
  cron.default.schedule(schedule, () => {
    runScheduler().catch((e) => console.error("[scheduler] Error:", e));
  });

  console.log(`[scheduler] Started — cron: ${schedule}`);
}
