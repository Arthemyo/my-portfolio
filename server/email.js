// Builds the notification email from already-validated form data.

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function buildContactEmail(data, { to, from, receivedAt = new Date(), ip }) {
  const rows = [
    ["Name", data.name],
    ["Email", data.email],
    ["Phone", data.phone || "—"],
    ["Subject", data.subject],
  ];

  const text = [
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Message:",
    data.message,
    "",
    `Received: ${receivedAt.toISOString()}${ip ? ` from ${ip}` : ""}`,
  ].join("\n");

  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#1f2328">
<h2 style="margin:0 0 12px">New message from your portfolio</h2>
<table cellpadding="6" style="border-collapse:collapse">
${rows.map(([k, v]) => `<tr><th align="left" style="border-bottom:1px solid #ddd">${k}</th><td style="border-bottom:1px solid #ddd">${escapeHtml(v)}</td></tr>`).join("\n")}
</table>
<h3 style="margin:20px 0 8px">Message</h3>
<div style="white-space:pre-wrap;border-left:3px solid #0969da;padding-left:12px">${escapeHtml(data.message)}</div>
<p style="color:#59636e;font-size:12px;margin-top:24px">Received ${escapeHtml(receivedAt.toISOString())}</p>
</body></html>`;

  return {
    to, // always the configured owner address, never user input
    from,
    replyTo: { name: data.name, address: data.email },
    subject: `[Portfolio] ${data.subject}`,
    text,
    html,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}
