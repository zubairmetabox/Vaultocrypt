import { Resend } from "resend";
import { writeSystemLog } from "@/lib/system-log";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function buildFrom(email: string, name?: string | null): string {
  return name?.trim() ? `${name.trim()} <${email}>` : email;
}

// ─── Share notification ───────────────────────────────────────────────────────

export async function sendShareNotification({
  to,
  from,
  fromName,
  shareUrl,
  projectName,
  recordTitles,
  expiresLabel,
  senderName,
}: {
  to: string;
  from: string;
  fromName?: string | null;
  shareUrl: string;
  projectName: string;
  recordTitles: string[];
  expiresLabel: string;
  senderName: string;
}) {
  const recordList = recordTitles
    .map((t) => `<li style="margin:4px 0;color:#94a3b8;font-size:14px;">${escapeHtml(t)}</li>`)
    .join("");

  try {
    await getResend().emails.send({
      from: buildFrom(from, fromName),
      to,
      subject: `${escapeHtml(senderName)} shared credentials with you`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#0f1923;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px 20px;border-bottom:1px solid #1e293b;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:32px;height:32px;background:linear-gradient(135deg,#38bdf8,#22d3ee);border-radius:8px;text-align:center;vertical-align:middle;">
                <span style="color:#0f172a;font-size:16px;font-weight:700;line-height:32px;">V</span>
              </td>
              <td style="padding-left:10px;color:#f1f5f9;font-size:14px;font-weight:600;">Vaultocrypt</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 6px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Shared credentials</p>
          <h1 style="margin:0 0 16px;color:#f1f5f9;font-size:20px;font-weight:600;line-height:1.3;">${escapeHtml(projectName)}</h1>
          <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
            <strong style="color:#94a3b8;">${escapeHtml(senderName)}</strong> has shared the following credentials with you:
          </p>
          <ul style="margin:0 0 24px;padding-left:18px;">${recordList}</ul>

          <p style="margin:0 0 20px;color:#64748b;font-size:13px;line-height:1.6;padding:12px 16px;background:#0a0f1e;border:1px solid #1e3a5f;border-radius:8px;">
            🔐 When you open the link, a <strong style="color:#94a3b8;">verification code</strong> will be sent to this email address. Enter it to access the credentials.
          </p>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr>
              <td style="background:linear-gradient(135deg,#38bdf8,#22d3ee);border-radius:8px;padding:1px;">
                <a href="${shareUrl}" style="display:block;background:#0f1923;border-radius:7px;padding:11px 28px;color:#38bdf8;font-size:14px;font-weight:600;text-decoration:none;text-align:center;">
                  View credentials →
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0;color:#334155;font-size:12px;">Link expires: ${escapeHtml(expiresLabel)}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  } catch (err) {
    await writeSystemLog("email:share-notification", `Failed to send share notification to ${to}`, {
      to,
      projectName,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ─── OTP email ────────────────────────────────────────────────────────────────

export async function sendOtpEmail({
  to,
  from,
  fromName,
  otp,
  projectName,
}: {
  to: string;
  from: string;
  fromName?: string | null;
  otp: string;
  projectName: string;
}) {
  try {
    await getResend().emails.send({
      from: buildFrom(from, fromName),
      to,
      subject: `Your verification code`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#0f1923;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px 20px;border-bottom:1px solid #1e293b;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:32px;height:32px;background:linear-gradient(135deg,#38bdf8,#22d3ee);border-radius:8px;text-align:center;vertical-align:middle;">
                <span style="color:#0f172a;font-size:16px;font-weight:700;line-height:32px;">V</span>
              </td>
              <td style="padding-left:10px;color:#f1f5f9;font-size:14px;font-weight:600;">Vaultocrypt</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px;text-align:center;">
          <p style="margin:0 0 8px;color:#64748b;font-size:13px;">Your verification code for</p>
          <p style="margin:0 0 28px;color:#f1f5f9;font-size:16px;font-weight:600;">${escapeHtml(projectName)}</p>
          <div style="display:inline-block;background:#0a0f1e;border:1px solid #1e3a5f;border-radius:12px;padding:20px 40px;margin:0 0 28px;">
            <span style="font-family:'Courier New',monospace;font-size:40px;font-weight:700;letter-spacing:0.3em;color:#38bdf8;">${otp}</span>
          </div>
          <p style="margin:0;color:#334155;font-size:12px;line-height:1.6;">
            Valid for <strong style="color:#475569;">10 minutes</strong>. Do not share this code.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  } catch (err) {
    await writeSystemLog("email:otp", `Failed to send OTP email to ${to}`, {
      to,
      projectName,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
