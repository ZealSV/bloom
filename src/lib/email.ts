import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const sprite = `${baseUrl}/bloom_happy.png`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#0f0f10;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f10;padding:36px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#1c1c1e;border-radius:22px;border:1px solid #2c2c30;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,0.35);">
          <tr>
            <td style="padding:28px 28px 24px;text-align:center;">
              <div style="font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:18px;font-weight:600;color:#f2f2f2;letter-spacing:0.02em;">
                bloom
              </div>
              <div style="margin:18px 0 16px;">
                <img src="${sprite}" width="120" height="120" alt="Bloom" style="display:block;margin:0 auto;border-radius:18px;border:1px solid #3a3a40;background:#1f1f22;" />
              </div>
              <div style="font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:28px;font-weight:700;letter-spacing:0.28em;color:#f7f7f8;background:#2a2a2e;border-radius:14px;padding:14px 18px;display:inline-block;border:1px solid #3a3a40;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.03);">
                ${otp}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from: `"Bloom" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${otp} — bloom`,
    text: `bloom\n\n${otp}`,
    html,
  });
}
