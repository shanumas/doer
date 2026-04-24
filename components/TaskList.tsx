"use client";

const STATUS_COLOR: Record<string, string> = {
  PENDING_APPROVAL: "bg-yellow-500/20 text-yellow-300",
  APPROVED: "bg-blue-500/20 text-blue-300",
  RUNNING: "bg-purple-500/20 text-purple-300",
  DONE: "bg-green-500/20 text-green-300",
  FAILED: "bg-red-500/20 text-red-300",
  DENIED: "bg-gray-500/20 text-gray-400",
};

export default function TaskList({ tasks, selected, onSelect }: {
  tasks: any[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="p-3 space-y-1">
      <p className="text-xs text-gray-500 uppercase tracking-wider px-2 pb-2">Tasks ({tasks.length})</p>
      {tasks.length === 0 && (
        <p className="text-gray-600 text-sm px-2">No tasks yet. Scheduler will pick issues automatically.</p>
      )}
      {tasks.map((task) => (
        <button
          key={task.id}
          onClick={() => onSelect(task.id)}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
            selected === task.id ? "bg-gray-800" : "hover:bg-gray-900"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">#{task.issueNumber} {task.issueTitle}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[task.status]}`}>
              {task.status.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-gray-600 truncate">{task.repo}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
