import {
  forwardEmails,
  scrapeMetas,
  urlMetas,
  userEmails,
  userFiles,
  userSendEmails,
  userUrls,
  users,
} from "@/lib/db/schema";

export const UserRole = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export type User = typeof users.$inferSelect;

export type UrlMeta = typeof urlMetas.$inferSelect & {
  userUrl?: Pick<typeof userUrls.$inferSelect, "id" | "userId" | "url" | "target" | "prefix"> | null;
};

export type ScrapeMeta = typeof scrapeMetas.$inferSelect;

export type ForwardEmail = typeof forwardEmails.$inferSelect;

export type UserEmail = typeof userEmails.$inferSelect & {
  user?: User | null;
  forwardEmails?: ForwardEmail[];
  _count?: {
    forwardEmails?: number;
  } | null;
};

export type UserSendEmail = typeof userSendEmails.$inferSelect;

export type UserFile = typeof userFiles.$inferSelect & {
  user?: {
    name: string | null;
    email: string | null;
  } | null;
};
