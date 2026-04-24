import { getConfig } from "./config";

export async function sendApprovalCard(opts: {
  taskId: string;
  token: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  repo: string;
}) {
  const webhookUrl = (await getConfig("teams_webhook_url")) ?? process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("Teams webhook URL not configured. Set it in /setup.");

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const body = opts.issueBody.length > 300 ? opts.issueBody.slice(0, 300) + "…" : opts.issueBody;

  const card = {
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.4",
        body: [
          { type: "TextBlock", size: "Medium", weight: "Bolder", text: `🤖 doer — Issue #${opts.issueNumber}` },
          { type: "TextBlock", text: opts.issueTitle, wrap: true, weight: "Bolder" },
          { type: "TextBlock", text: `Repo: \`${opts.repo}\``, isSubtle: true },
          { type: "TextBlock", text: body || "_No description_", wrap: true, maxLines: 6 },
        ],
        actions: [
          { type: "Action.OpenUrl", title: "✅ Approve", style: "positive",
            url: `${appUrl}/api/approve?token=${opts.token}&action=approve` },
          { type: "Action.OpenUrl", title: "❌ Deny", style: "destructive",
            url: `${appUrl}/api/approve?token=${opts.token}&action=deny` },
          { type: "Action.OpenUrl", title: "🔍 View Thread",
            url: `${appUrl}/task/${opts.taskId}` },
        ],
      },
    }],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card),
  });

  if (!res.ok) throw new Error(`Teams webhook failed: ${res.status}`);
}
