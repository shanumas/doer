import { NextRequest } from "next/server";
import { db } from "@/lib/db";

// Dashboard → SSE stream of logs
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let lastId = "";

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();

      // Send existing logs first
      const existing = await db.log.findMany({ where: { taskId: id }, orderBy: { createdAt: "asc" } });
      for (const log of existing) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(log)}\n\n`));
        lastId = log.id;
      }

      // Poll for new logs every second
      const interval = setInterval(async () => {
        const newLogs = await db.log.findMany({
          where: { taskId: id, id: { gt: lastId } },
          orderBy: { createdAt: "asc" },
        });
        for (const log of newLogs) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(log)}\n\n`));
          lastId = log.id;
        }
      }, 1000);

      req.signal.addEventListener("abort", () => clearInterval(interval));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
