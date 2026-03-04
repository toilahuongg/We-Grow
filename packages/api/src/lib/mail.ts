import { createMailClient, type MailClient } from "@misoapps/mail-sdk";
import { env } from "@we-grow/env/server";

let mailClient: MailClient | null = null;

export function getMailClient(): MailClient | null {
  if (mailClient) return mailClient;
  if (!env.MAIL_SERVICE_ENDPOINT) return null;

  mailClient = createMailClient({
    endpoint: env.MAIL_SERVICE_ENDPOINT,
  });

  return mailClient;
}
