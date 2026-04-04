// Indicate module load and that Brevo-based emails are used
console.log(
  "sendemail module loaded: using Brevo (@getbrevo/brevo) for emails"
);

import { BrevoClient } from "@getbrevo/brevo";

let brevoClient = null;

const getBrevoClient = () => {
  const apiKey = process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim();
  if (!apiKey) return null;

  if (!brevoClient) {
    brevoClient = new BrevoClient({ apiKey });
  }

  return brevoClient;
};

const sendVerificationEmail = async (
  email,
  name,
  tokenOrCode,
  { isCode = false } = {}
) => {
  console.log("sendemail.sendVerificationEmail invoked", {
    email,
    isCode: Boolean(isCode),
  });
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${tokenOrCode}`;
  const logoUrl = `${process.env.CLIENT_URL || ""}/src/logo/app_logo.png`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; background-color: #f6fbfa;">
      <div style="text-align:center;padding:18px 0;">
        <img src="${logoUrl}" alt="FitCek" style="height:56px;display:inline-block;" />
      </div>
      <div style="background: white; padding: 28px; border-radius: 12px; box-shadow: 0 4px 18px rgba(2,6,23,0.06);">
        <h2 style="color: #042827; margin-top:0">Hi ${name}! 👋</h2>
        <p style="color: #475e63; font-size: 16px;">Thanks for signing up for <strong>FitCek</strong>. Please verify your email address to activate your account.</p>
        <div style="text-align: center; margin: 28px 0;">
          ${
            isCode
              ? `<div style="font-size:28px;letter-spacing:6px;background:#f0f9f8;display:inline-block;padding:14px 22px;border-radius:8px;font-weight:700;color:#013a34">${tokenOrCode}</div>`
              : `<a href="${verifyUrl}" 
             style="background: linear-gradient(90deg, #01786f 0%, #06b6d4 100%); 
                    color: white; 
                    padding: 12px 28px; 
                    border-radius: 30px; 
                    text-decoration: none; 
                    font-size: 15px;
                    font-weight: 700;">
            Verify My Email
          </a>`
          }
        </div>
        <p style="color: #94a3b8; font-size: 13px;">This link expires in <strong>${process.env.EMAIL_VERIFICATION_EXPIRE_TIME || "24 hours"}</strong>. If you didn't create an account, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eef2f6; margin: 20px 0;">
        <p style="color: #9aa7a3; font-size: 12px; text-align: center;">FitCek © ${new Date().getFullYear()}</p>
      </div>
    </div>
  `;

  const client = getBrevoClient();
  if (!client) {
    console.error("sendVerificationEmail: BREVO_API_KEY not configured");
    throw new Error("BREVO_API_KEY not configured — cannot send email");
  }

  const senderEmail =
    process.env.SENDER_EMAIL && process.env.SENDER_EMAIL.trim();
  if (!senderEmail) {
    throw new Error("SENDER_EMAIL not configured — cannot send email");
  }

  const payload = {
    sender: { name: process.env.SENDER_NAME || "FitCek", email: senderEmail },
    to: [{ email, name }],
    subject: "✅ Verify Your Email – FitCek",
    htmlContent,
  };

  console.log("sendVerificationEmail: sending via Brevo", {
    SENDER_EMAIL: senderEmail,
  });
  try {
    const resp = await client.transactionalEmails.sendTransacEmail(payload);
    console.log("sendVerificationEmail: Brevo accepted send");
    return resp;
  } catch (err) {
    console.error(
      "sendVerificationEmail: Brevo send failed",
      err && (err.response || err.body || err.message || err)
    );
    throw err;
  }
};

const sendPasswordResetEmail = async (email, name, token) => {
  console.log("sendemail.sendPasswordResetEmail invoked", { email });
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  const logoUrl = `${process.env.CLIENT_URL || ""}/src/logo/app_logo.png`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; background-color: #f6fbfa;">
      <div style="text-align:center;padding:18px 0;">
        <img src="${logoUrl}" alt="FitCek" style="height:56px;display:inline-block;" />
      </div>
      <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 18px rgba(2,6,23,0.06);">
        <h2 style="margin-top:0;color:#042827">Hi ${name},</h2>
        <p style="color:#475e63">You requested a password reset. Click the button below to set a new password.</p>
        <div style="text-align:center;margin:20px 0;">
          <a href="${resetUrl}" style="background:linear-gradient(90deg,#01786f 0%,#06b6d4 100%);color:white;padding:12px 24px;border-radius:26px;text-decoration:none;font-weight:700;">Reset Password</a>
        </div>
        <p style="color:#94a3b8;font-size:13px">This link expires in 1 hour.</p>
      </div>
    </div>
  `;

  const client = getBrevoClient();
  if (!client) {
    console.error("sendPasswordResetEmail: BREVO_API_KEY not configured");
    throw new Error("BREVO_API_KEY not configured — cannot send email");
  }

  const senderEmail =
    process.env.SENDER_EMAIL && process.env.SENDER_EMAIL.trim();
  if (!senderEmail) {
    throw new Error("SENDER_EMAIL not configured — cannot send email");
  }

  const payload = {
    sender: { name: process.env.SENDER_NAME || "FitCek", email: senderEmail },
    to: [{ email, name }],
    subject: "🔑 Reset Your Password – FitCek",
    htmlContent,
  };

  console.log("sendPasswordResetEmail: sending via Brevo", {
    SENDER_EMAIL: senderEmail,
  });
  try {
    const resp = await client.transactionalEmails.sendTransacEmail(payload);
    console.log("sendPasswordResetEmail: Brevo accepted send");
    return resp;
  } catch (err) {
    console.error(
      "sendPasswordResetEmail: Brevo send failed",
      err && (err.response || err.body || err.message || err)
    );
    throw err;
  }
};

export default { sendVerificationEmail, sendPasswordResetEmail };
