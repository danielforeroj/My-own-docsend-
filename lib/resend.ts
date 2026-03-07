import { Resend } from "resend";

function hasResendConfig() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && process.env.LEAD_NOTIFICATION_EMAIL);
}

export async function sendNewLeadNotificationEmail(input: {
  shareToken: string;
  linkName: string | null;
  payload: Record<string, string | boolean>;
  submittedAt: string;
}) {
  if (!hasResendConfig()) {
    return { skipped: true as const };
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);

  const rows = Object.entries(input.payload)
    .map(([key, value]) => `<tr><td style="padding:6px 10px;border:1px solid #ddd"><strong>${key}</strong></td><td style="padding:6px 10px;border:1px solid #ddd">${String(value)}</td></tr>`)
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>New lead captured</h2>
      <p><strong>Share token:</strong> ${input.shareToken}</p>
      <p><strong>Share name:</strong> ${input.linkName ?? "(unnamed)"}</p>
      <p><strong>Submitted at:</strong> ${new Date(input.submittedAt).toLocaleString()}</p>
      <table style="border-collapse:collapse;min-width:320px">${rows}</table>
    </div>
  `;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: [process.env.LEAD_NOTIFICATION_EMAIL!],
    subject: `New lead from share link ${input.linkName ?? input.shareToken}`,
    html
  });

  return { skipped: false as const };
}
