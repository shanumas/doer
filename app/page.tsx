"use client";
import { useEffect, useState } from "react";
import LogStream from "@/components/LogStream";

const STATUS_COLOR: Record<string, string> = {
  PENDING_APPROVAL: "bg-yellow-500/20 text-yellow-300",
  APPROVED:         "bg-blue-500/20 text-blue-300",
  RUNNING:          "bg-purple-500/20 text-purple-300 animate-pulse",
  DONE:             "bg-green-500/20 text-green-300",
  FAILED:           "bg-red-500/20 text-red-300",
  DENIED:           "bg-gray-500/20 text-gray-400",
};

export default function Dashboard() {
  const [issues, setIssues]   = useState<any[]>([]);
  const [tasks, setTasks]     = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [fixing, setFixing]   = useState<number | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  const refresh = () => {
    fetch("/api/tasks").then((r) => r.json()).then(setTasks);
    fetch("/api/issues").then((r) => r.json()).then(setIssues);
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, []);

  async function approve(task: any) {
    setApproving(task.id);
    setSelected(task.id);
    await fetch(`/api/approve?token=${task.approvalToken}&action=approve`);
    setApproving(null);
    refresh();
  }

  async function fix(issue: any) {
    setFixing(issue.number);
    const res = await fetch("/api/tasks/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueNumber: issue.number, issueTitle: issue.title, issueBody: issue.body }),
    });
    const { taskId } = await res.json();
    setFixing(null);
    refresh();
    setSelected(taskId);
  }

  const selectedTask = tasks.find((t) => t.id === selected);

  return (
    <div className="flex h-[calc(100vh-53px)]">

      {/* LEFT PANEL */}
      <aside className="w-80 border-r border-gray-800 overflow-y-auto flex flex-col">

        {/* Available issues */}
        {issues.length > 0 && (
          <div className="p-3 border-b border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider px-2 pb-2">
              Available ({issues.length})
            </p>
            <div className="space-y-1">
              {issues.map((issue) => (
                <div key={issue.number}
                  className="px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors">
                  <p className="text-sm font-medium truncate">#{issue.number} {issue.title}</p>
                  {issue.body && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{issue.body.slice(0, 80)}</p>
                  )}
                  <button
                    onClick={() => fix(issue)}
                    disabled={fixing === issue.number}
                    className="mt-2 w-full text-xs bg-white text-gray-900 font-semibold py-1.5 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50">
                    {fixing === issue.number ? "Starting…" : "⚡ Fix it"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks */}
        <div className="p-3 flex-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider px-2 pb-2">
            Tasks ({tasks.length})
          </p>
          {tasks.length === 0 && issues.length === 0 && (
            <p className="text-gray-600 text-sm px-2">No issues with the <code className="text-gray-500">doer</code> label found.</p>
          )}
          <div className="space-y-1">
            {tasks.map((task) => (
              <div key={task.id}
                onClick={() => setSelected(task.id)}
                className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  selected === task.id ? "bg-gray-800" : "hover:bg-gray-900"
                }`}>
                <p className="text-sm font-medium truncate">#{task.issueNumber} {task.issueTitle}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[task.status]}`}>
                    {task.status.replace(/_/g, " ")}
                  </span>
                  {task.prUrl && (
                    <a href={task.prUrl} target="_blank" onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-400 hover:underline">PR →</a>
                  )}
                </div>
                {task.status === "PENDING_APPROVAL" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); approve(task); }}
                    disabled={approving === task.id}
                    className="mt-2 w-full text-xs bg-white text-gray-900 font-semibold py-1.5 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50">
                    {approving === task.id ? "Starting…" : "⚡ Fix it"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* RIGHT PANEL */}
      <main className="flex-1 overflow-y-auto">
        {selected
          ? <LogStream taskId={selected} task={selectedTask} />
          : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <p className="text-gray-500">Select a task to view logs</p>
              {issues.length > 0 && (
                <p className="text-gray-600 text-sm">or click <strong className="text-gray-400">⚡ Fix it</strong> on an issue to start the agent</p>
              )}
            </div>
          )
        }
      </main>
    </div>
  );
}
