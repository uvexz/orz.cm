import { forwardEmails, userEmails } from "@/lib/db/schema";

export type UserRole = "ADMIN" | "USER";
export type UserEmailRow = typeof userEmails.$inferSelect;
export type ForwardEmailRow = typeof forwardEmails.$inferSelect;

export interface EmailActor {
  id: string;
  role: UserRole;
  team: string;
}

export interface EmailApiActor {
  id: string;
  team: string | null;
  active?: number;
}

export interface EmailDomainRule {
  domain_name: string;
  min_email_length: number;
}

export type EmailAddress = {
  name: string;
  address?: string;
  group?: EmailAddress[];
};

export type EmailHeader = Record<string, string>;

export interface OriginalEmail {
  from: string;
  fromName: string;
  to: string;
  cc?: string;
  subject?: string;
  text?: string;
  html?: string;
  date?: string;
  messageId?: string;
  replyTo?: string;
  headers?: string;
  attachments?: {
    filename: string;
    mimeType: string;
    r2Path: string;
    size: number;
  }[];
}

export interface UserEmailList extends UserEmailRow {
  count: number;
  unreadCount: number;
  user: string;
  email: string;
}
