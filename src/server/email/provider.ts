import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

import { getServerEnvironment } from "@/server/env";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailSendResult =
  | { ok: true; detail: string }
  | { ok: false; transient: boolean; detail: string };

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

export class SimulatedEmailProvider implements EmailProvider {
  readonly name = "simulated";

  async send(message: EmailMessage): Promise<EmailSendResult> {
    return {
      ok: true,
      detail: `Simulated delivery (no SMTP configured): to=${message.to} subject="${message.subject}"`,
    };
  }
}

export class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  private readonly transport: Transporter;

  constructor(
    private readonly configuration: {
      host: string;
      port: number;
      secure: boolean;
      user?: string;
      pass?: string;
      from: string;
    },
  ) {
    this.transport = nodemailer.createTransport({
      host: configuration.host,
      port: configuration.port,
      secure: configuration.secure,
      auth: configuration.user
        ? { user: configuration.user, pass: configuration.pass ?? "" }
        : undefined,
    });
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      await this.transport.sendMail({
        from: this.configuration.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return { ok: true, detail: `Sent via SMTP to ${message.to}.` };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const transient = isTransientSmtpError(detail);
      return { ok: false, transient, detail };
    }
  }
}

function isTransientSmtpError(detail: string): boolean {
  const lower = detail.toLowerCase();
  return /timed out|connect econnrefused|connection reset|temporary|retry|4[0-9][0-9]/.test(lower);
}

export function getEmailProvider(): EmailProvider {
  const environment = getServerEnvironment();
  if (!environment.SMTP_HOST) {
    return new SimulatedEmailProvider();
  }
  return new SmtpEmailProvider({
    host: environment.SMTP_HOST,
    port: environment.SMTP_PORT,
    secure: environment.SMTP_SECURE,
    user: environment.SMTP_USER,
    pass: environment.SMTP_PASS,
    from: environment.EMAIL_FROM,
  });
}
