import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Share notification ───────────────────────────────────────────────────────

export async function sendShareNotification({
  to,
  from,
  shareUrl,
  projectName,
  recordTitles,
  expiresLabel,
  senderName,
}: {
  to: string;
  from: string;
  shareUrl: string;
  projectName: string;
  recordTitles: string[];
  expiresLabel: string;
  senderName: string;
}) {
  const recordList = recordTitles
    .map((t) => `<li style="margin:4px 0;color:#94a3b8;">${escapeHtml(t)}</li>`)
    .join("");

  await resend.emails.send({
    from,
    to,
    subject: `${senderName} shared credentials from ${projectName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#0f1923;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:32px 32px 24px;border-bottom:1px solid #1e293b;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:36px;height:36px;background:linear-gradient(135deg,#38bdf8,#22d3ee);border-radius:10px;text-align:center;vertical-align:middle;">
                <span style="color:#0f172a;font-size:18px;font-weight:700;">V</span>
              </td>
              <td style="padding-left:10px;color:#f1f5f9;font-size:15px;font-weight:600;">Vaultocrypt</td>
            </tr>
          </table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;">Shared credentials</p>
          <h1 style="margin:0 0 16px;color:#f1f5f9;font-size:22px;font-weight:600;">${escapeHtml(projectName)}</h1>
          <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
            <strong style="color:#94a3b8;">${escapeHtml(senderName)}</strong> has shared the following credentials with you.
            Click the button below to view them — you'll receive a one-time code by email to verify your identity.
          </p>

          <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;">
            ${recordList}
          </ul>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr>
              <td style="background:linear-gradient(135deg,#38bdf8,#22d3ee);border-radius:10px;padding:1px;">
                <a href="${shareUrl}" style="display:block;background:#0f1923;border-radius:9px;padding:12px 28px;color:#38bdf8;font-size:14px;font-weight:600;text-decoration:none;">
                  View credentials →
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0;color:#334155;font-size:12px;">
            Link expires: ${escapeHtml(expiresLabel)}.
            If you weren't expecting this, you can safely ignore it.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

// ─── OTP email ────────────────────────────────────────────────────────────────

export async function sendOtpEmail({
  to,
  from,
  otp,
  projectName,
}: {
  to: string;
  from: string;
  otp: string;
  projectName: string;
}) {
  await resend.emails.send({
    from,
    to,
    subject: `Your Vaultocrypt verification code`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#0f1923;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 32px 24px;border-bottom:1px solid #1e293b;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:36px;height:36px;background:linear-gradient(135deg,#38bdf8,#22d3ee);border-radius:10px;text-align:center;vertical-align:middle;">
                <span style="color:#0f172a;font-size:18px;font-weight:700;">V</span>
              </td>
              <td style="padding-left:10px;color:#f1f5f9;font-size:15px;font-weight:600;">Vaultocrypt</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px;text-align:center;">
          <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;">Verification code</p>
          <p style="margin:0 0 24px;color:#64748b;font-size:14px;">
            Enter this code to access the <strong style="color:#94a3b8;">${escapeHtml(projectName)}</strong> credentials.
          </p>
          <div style="display:inline-block;background:#0a0f1e;border:1px solid #1e3a5f;border-radius:12px;padding:20px 40px;margin:0 0 24px;">
            <span style="font-family:'Courier New',monospace;font-size:36px;font-weight:700;letter-spacing:0.25em;color:#38bdf8;">${otp}</span>
          </div>
          <p style="margin:0;color:#334155;font-size:12px;">
            Valid for 10 minutes. Do not share this code with anyone.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
