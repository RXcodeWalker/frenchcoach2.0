/** The email fallback for a daily nudge (sent only when every push failed). */
import type { Nudge } from './dailyNudge';
import { escapeHtml } from './weeklyReport';

export function renderNudgeEmail(nudge: Nudge, url: string, settingsUrl: string): { html: string; text: string } {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#F6F5F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid #E6E4DE;border-radius:16px;">
<tr><td style="padding:24px;">
<h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#1C1A17;">${escapeHtml(nudge.title)}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#56524B;">${escapeHtml(nudge.body)}</p>
<a href="${escapeHtml(url)}" style="display:inline-block;background:#7C3AED;color:#FFFFFF;padding:12px 20px;border-radius:999px;font-weight:600;font-size:15px;text-decoration:none;">Open FrenchCoach</a>
</td></tr>
<tr><td style="padding:0 24px 24px;font-size:12px;color:#6E6A62;">Reminders are on for your account. <a href="${escapeHtml(settingsUrl)}" style="color:#6E6A62;">Change them in Settings</a>.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${nudge.title}\n\n${nudge.body}\n\nOpen FrenchCoach: ${url}\n\nChange reminders in Settings: ${settingsUrl}`;
  return { html, text };
}
