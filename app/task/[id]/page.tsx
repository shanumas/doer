import { db } from "@/lib/db";
import LogStream from "@/components/LogStream";
import { notFound } from "next/navigation";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await db.task.findUnique({ where: { id } });
  if (!task) return notFound();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">#{task.issueNumber} — {task.issueTitle}</h1>
        <p className="text-gray-400 text-sm mt-1">{task.repo}</p>
      </div>
      <LogStream taskId={id} task={task} />
    </div>
  );
}
