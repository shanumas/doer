"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SetupInner() {
  const params = useSearchParams();
  const [config, setConfig] = useState({ github_connected: false, github_repo: "", teams_configured: false });
  const [repos, setRepos] = useState<{ full_name: string; private: boolean }[]>([]);
  const [repo, setRepo] = useState("");
  const [teamsUrl, setTeamsUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((c) => {
      setConfig(c);
      setRepo(c.github_repo ?? "");
    });
  }, []);

  useEffect(() => {
    if (config.github_connected) {
      fetch("/api/auth/github/repos").then((r) => r.json()).then(setRepos).catch(() => {});
    }
  }, [config.github_connected]);

  async function save() {
    setSaving(true);
    const body: Record<string, string> = {};
    if (repo) body.github_repo = repo;
    if (teamsUrl) body.teams_webhook_url = teamsUrl;
    await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setConfig((c) => ({ ...c, github_repo: repo || c.github_repo, teams_configured: !!teamsUrl || c.teams_configured }));
  }

  const error = params.get("error");

  return (
    <div className="max-w-xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Setup</h1>
          <p className="text-gray-400 text-sm mt-1">Connect your tools to get started.</p>
        </div>
        <a href="/" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">← Dashboard</a>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          GitHub auth error: {error}
        </div>
      )}

      {/* GitHub */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">GitHub</h2>
            <p className="text-gray-400 text-xs mt-0.5">Needs repo + read:project access</p>
          </div>
          {config.github_connected
            ? <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-medium">✓ Connected</span>
            : <a href="/api/auth/github" className="bg-gray-100 text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-white transition-colors">
                Connect GitHub
              </a>
          }
        </div>

        {config.github_connected && (
          <div>
            <label className="text-sm text-gray-400 block mb-1">Repository</label>
            {repos.length > 0
              ? <select value={repo} onChange={(e) => setRepo(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500">
                  <option value="">Select a repository…</option>
                  {repos.map((r) => (
                    <option key={r.full_name} value={r.full_name}>{r.full_name} {r.private ? "🔒" : ""}</option>
                  ))}
                </select>
              : <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/repo"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500" />
            }
          </div>
        )}
      </section>

      {/* Teams */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Microsoft Teams</h2>
            <p className="text-gray-400 text-xs mt-0.5">Incoming webhook for approval messages</p>
          </div>
          {config.teams_configured && !teamsUrl &&
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-medium">✓ Configured</span>
          }
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">
            Webhook URL
            <a href="https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook"
              target="_blank" className="ml-2 text-blue-400 hover:underline text-xs">How to create one →</a>
          </label>
          <input value={teamsUrl} onChange={(e) => setTeamsUrl(e.target.value)}
            placeholder={config.teams_configured ? "••••••••••••• (already set, paste to update)" : "https://your-org.webhook.office.com/..."}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500" />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="bg-white text-gray-900 font-medium px-5 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-green-400 text-sm">Saved!</span>}
        {config.github_connected && config.github_repo && config.teams_configured && (
          <a href="/" className="text-blue-400 text-sm hover:underline ml-auto">Go to dashboard →</a>
        )}
      </div>
    </div>
  );
}

export default function SetupPage() {
  return <Suspense><SetupInner /></Suspense>;
}
