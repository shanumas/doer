"use client";
import { useEffect, useRef, useState } from "react";

const LEVEL_STYLE: Record<string, string> = {
  INFO: "text-gray-300",
  DECISION: "text-yellow-300 font-medium",
  ERROR: "text-red-400",
};

const PR_STATE_STYLE: Record<string, string> = {
  open:   "bg-blue-500/20 text-blue-300",
  merged: "bg-purple-500/20 text-purple-300",
  closed: "bg-gray-500/20 text-gray-400",
};

export default function LogStream({ taskId, task }: { taskId: string; task: any }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [prState, setPrState] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs([]);
    const es = new EventSource(`/api/tasks/${taskId}/logs`);
    es.onmessage = (e) => {
      setLogs((prev) => [...prev, JSON.parse(e.data)]);
    };
    return () => es.close();
  }, [taskId]);

  useEffect(() => {
    if (!task?.prUrl) return;
    const check = () =>
      fetch(`/api/tasks/${taskId}/pr-state`)
        .then((r) => r.json())
        .then((d) => { if (d.state) setPrState(d.state); });
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, [taskId, task?.prUrl]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="p-6 h-full flex flex-col">
      {task && (
        <div className="mb-4 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-semibold">#{task.issueNumber} {task.issueTitle}</h2>
            {task.prUrl && (
              <a href={task.prUrl} target="_blank" className="text-xs text-blue-400 hover:underline">
                View PR →
              </a>
            )}
            {prState && (
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${PR_STATE_STYLE[prState] ?? "bg-gray-500/20 text-gray-400"}`}>
                PR {prState}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{task.repo}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto font-mono text-sm space-y-1">
        {logs.length === 0 && (
          <p className="text-gray-600">Waiting for logs…</p>
        )}
        {logs.map((log) => (
          <div key={log.id} className={`flex gap-3 ${LEVEL_STYLE[log.level]}`}>
            <span className="text-gray-600 shrink-0 text-xs pt-0.5">
              {new Date(log.createdAt).toLocaleTimeString()}
            </span>
            <span className="whitespace-pre-wrap break-words">{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
