/**
 * Minimal SMTP transport implementation.
 *
 * This is a lightweight alternative to nodemailer that avoids adding a large
 * dependency for a relatively simple use case. It supports:
 *   - Plain SMTP (port 25 / 587 with STARTTLS via net module)
 *   - Implicit TLS (port 465 via tls module)
 *   - AUTH PLAIN / LOGIN mechanisms
 *
 * EXTERNAL VERIFICATION REQUIRED: Live delivery can only be tested with real SMTP credentials.
 */

import * as net from 'node:net';
import * as tls from 'node:tls';

interface SmtpTransportOptions {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
}

interface MailOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface Transport {
  sendMail(options: MailOptions): Promise<void>;
}

function base64(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64');
}

function buildMessage(opts: MailOptions): string {
  const boundary = `----=_Part_${Date.now().toString(16)}`;
  const lines: string[] = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    opts.text,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    opts.html,
    ``,
    `--${boundary}--`,
  ];
  return lines.join('\r\n');
}

async function smtpConversation(
  socket: net.Socket | tls.TLSSocket,
  opts: SmtpTransportOptions,
  mail: MailOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];
    let step = 0;
    const message = buildMessage(mail);

    const send = (cmd: string): void => {
      socket.write(`${cmd}\r\n`);
    };

    const next = (): void => {
      switch (step++) {
        case 0:
          send(`EHLO code-to-escape`);
          break;
        case 1:
          send(`AUTH LOGIN`);
          break;
        case 2:
          send(base64(opts.auth.user));
          break;
        case 3:
          send(base64(opts.auth.pass));
          break;
        case 4:
          send(`MAIL FROM:<${mail.from}>`);
          break;
        case 5:
          send(`RCPT TO:<${mail.to}>`);
          break;
        case 6:
          send(`DATA`);
          break;
        case 7:
          send(`${message}\r\n.`);
          break;
        case 8:
          send(`QUIT`);
          break;
        default:
          break;
      }
    };

    socket.on('data', (chunk: Buffer) => {
      const response = chunk.toString();
      lines.push(response);
      const code = response.slice(0, 3);
      if (code.startsWith('4') || code.startsWith('5')) {
        socket.destroy();
        reject(new Error(`SMTP error: ${response.trim()}`));
        return;
      }
      if (response.includes('\r\n') || response.endsWith('\n')) {
        next();
      }
    });

    socket.on('error', reject);
    socket.on('close', () => {
      resolve();
    });

    // Initial greeting triggers the conversation
    socket.once('data', (chunk: Buffer) => {
      const greeting = chunk.toString();
      if (!greeting.startsWith('220')) {
        reject(new Error(`SMTP greeting failed: ${greeting.trim()}`));
        return;
      }
      next();
    });
  });
}

export function createTransport(opts: SmtpTransportOptions): Transport {
  return {
    sendMail: async (mail: MailOptions): Promise<void> => {
      return new Promise((resolve, reject) => {
        const connect = opts.secure ? tls.connect : net.createConnection;

        const socket = (connect as typeof net.createConnection)(
          { host: opts.host, port: opts.port },
          () => {
            void smtpConversation(opts.secure ? (socket as tls.TLSSocket) : socket, opts, mail)
              .then(resolve)
              .catch(reject);
          },
        );

        socket.on('error', reject);
        socket.setTimeout(15_000, () => {
          socket.destroy();
          reject(new Error('SMTP connection timed out'));
        });
      });
    },
  };
}
