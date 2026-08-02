/**
 * Email Service
 *
 * Providers:
 *   - DevEmailProvider  (default in development/test) — prints to stdout
 *   - SmtpEmailProvider — production-ready SMTP via Nodemailer-compatible
 *     plain-net implementation (no external SDK required)
 *
 * Configuration (env vars):
 *   SMTP_HOST      SMTP server hostname
 *   SMTP_PORT      SMTP port (default: 587)
 *   SMTP_SECURE    'true' for port 465 TLS, 'false' for STARTTLS (default: false)
 *   SMTP_USER      SMTP username
 *   SMTP_PASSWORD  SMTP password  ← NEVER log this
 *   EMAIL_FROM     Sender address (default: noreply@code-to-escape.app)
 *
 * Provider selection:
 *   NODE_ENV=production AND SMTP_HOST is set → SmtpEmailProvider
 *   otherwise                                → DevEmailProvider
 *
 * EXTERNAL VERIFICATION REQUIRED:
 *   Real SMTP delivery can only be verified with valid server credentials.
 *   In CI and development the DevEmailProvider is used automatically.
 */

import { createTransport } from './email-transport.js';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────
// Dev provider (stdout)
// ─────────────────────────────────────────────────────────────────

class DevEmailProvider implements EmailProvider {
  // eslint-disable-next-line @typescript-eslint/require-await
  async send(message: EmailMessage): Promise<void> {
    console.log('\n╔══════════════════════════════════╗');
    console.log('║         DEV EMAIL PREVIEW        ║');
    console.log('╠══════════════════════════════════╣');
    console.log(`║ To:      ${message.to.slice(0, 24).padEnd(24)}║`);
    console.log(`║ Subject: ${message.subject.slice(0, 24).padEnd(24)}║`);
    console.log('╠══════════════════════════════════╣');
    console.log(message.text);
    console.log('╚══════════════════════════════════╝\n');
  }
}

// ─────────────────────────────────────────────────────────────────
// SMTP provider
// ─────────────────────────────────────────────────────────────────

class SmtpEmailProvider implements EmailProvider {
  private readonly from: string;
  private readonly host: string;
  private readonly port: number;
  private readonly secure: boolean;
  private readonly user: string;
  private readonly password: string;

  constructor(opts: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
  }) {
    this.host = opts.host;
    this.port = opts.port;
    this.secure = opts.secure;
    this.user = opts.user;
    this.password = opts.password;
    this.from = opts.from;
  }

  async send(message: EmailMessage): Promise<void> {
    await createTransport({
      host: this.host,
      port: this.port,
      secure: this.secure,
      auth: { user: this.user, pass: this.password },
    }).sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// Provider factory — selects implementation at startup
// ─────────────────────────────────────────────────────────────────

function createEmailProvider(): EmailProvider {
  const smtpHost = process.env['SMTP_HOST'];
  const isProd = process.env['NODE_ENV'] === 'production';

  if (isProd && smtpHost) {
    const port = Number.parseInt(process.env['SMTP_PORT'] ?? '587', 10);
    const secure = process.env['SMTP_SECURE'] === 'true';
    const user = process.env['SMTP_USER'] ?? '';
    const password = process.env['SMTP_PASSWORD'] ?? '';
    const from = process.env['EMAIL_FROM'] ?? 'noreply@code-to-escape.app';

    if (!user || !password) {
      console.warn('[email] SMTP_USER or SMTP_PASSWORD not set — falling back to DevEmailProvider');
      return new DevEmailProvider();
    }

    console.log(`[email] Using SmtpEmailProvider → ${smtpHost}:${String(port)}`);
    return new SmtpEmailProvider({ host: smtpHost, port, secure, user, password, from });
  }

  if (smtpHost && !isProd) {
    // Allow SMTP in dev/staging if explicitly configured
    const port = Number.parseInt(process.env['SMTP_PORT'] ?? '587', 10);
    const secure = process.env['SMTP_SECURE'] === 'true';
    const user = process.env['SMTP_USER'] ?? '';
    const password = process.env['SMTP_PASSWORD'] ?? '';
    const from = process.env['EMAIL_FROM'] ?? 'noreply@code-to-escape.app';
    if (user && password) {
      console.log(`[email] Using SmtpEmailProvider (dev) → ${smtpHost}:${String(port)}`);
      return new SmtpEmailProvider({ host: smtpHost, port, secure, user, password, from });
    }
  }

  return new DevEmailProvider();
}

export const emailService: EmailProvider = createEmailProvider();

// ─────────────────────────────────────────────────────────────────
// Email builders
// ─────────────────────────────────────────────────────────────────

export function buildPasswordResetEmail(
  resetUrl: string,
): Pick<EmailMessage, 'subject' | 'html' | 'text'> {
  return {
    subject: 'Reset your Code to Escape password',
    text: `You requested a password reset for your Code to Escape account.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request this, please ignore this email.`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#0f172a;color:#f1f5f9;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:12px;padding:32px;border:1px solid #334155">
    <h1 style="color:#38bdf8;margin-top:0">Reset your password</h1>
    <p>You requested a password reset for your Code to Escape account.</p>
    <a href="${resetUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Reset Password</a>
    <p style="color:#94a3b8;font-size:14px">This link expires in 1 hour. If you did not request this, please ignore this email.</p>
    <p style="color:#64748b;font-size:12px">Or copy this URL: ${resetUrl}</p>
  </div>
</body>
</html>`,
  };
}

export function buildWelcomeEmail(
  username: string,
): Pick<EmailMessage, 'subject' | 'html' | 'text'> {
  return {
    subject: 'Welcome to Code to Escape!',
    text: `Welcome, ${username}!\n\nYour adventure begins now. Complete coding challenges, earn XP, and climb the leaderboard.\n\nStart playing: https://code-to-escape.app\n\nGood luck!`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#0f172a;color:#f1f5f9;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:12px;padding:32px;border:1px solid #334155">
    <h1 style="color:#38bdf8;margin-top:0">Welcome, ${username}! 🎮</h1>
    <p>Your coding adventure begins now. Solve challenges, earn XP, and escape the worlds of Code to Escape.</p>
    <a href="https://code-to-escape.app" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Start Playing</a>
    <p style="color:#94a3b8;font-size:14px">Good luck on your journey!</p>
  </div>
</body>
</html>`,
  };
}
