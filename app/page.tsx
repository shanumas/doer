"use client";
import { useEffect, useState } from "react";
import TaskList from "@/components/TaskList";
import LogStream from "@/components/LogStream";

export default function Dashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = () =>
    fetch("/api/tasks").then((r) => r.json()).then(setTasks);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-[calc(100vh-53px)]">
      <aside className="w-80 border-r border-gray-800 overflow-y-auto">
        <TaskList tasks={tasks} selected={selected} onSelect={setSelected} />
      </aside>
      <main className="flex-1 overflow-y-auto">
        {selected
          ? <LogStream taskId={selected} task={tasks.find((t) => t.id === selected)} />
          : <div className="flex items-center justify-center h-full text-gray-500">Select a task to view logs</div>
        }
      </main>
    </div>
  );
}
