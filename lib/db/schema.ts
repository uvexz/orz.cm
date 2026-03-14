import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "USER"]);

export const authUser = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const authSession = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true })
      .notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    activeOrganizationId: text("active_organization_id"),
  },
  (table) => ({
    tokenIdx: uniqueIndex("session_token_unique").on(table.token),
  }),
);

export const authAccount = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    mode: "date",
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    mode: "date",
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const authVerification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true })
    .notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  emailVerified: timestamp("emailVerified", {
    mode: "date",
    withTimezone: true,
  }),
  image: text("image"),
  active: integer("active").notNull().default(1),
  team: text("team").default("free"),
  apiKey: text("apiKey"),
  tgChatId: text("tgChatId"),
  tgUsername: text("tgUsername"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  role: userRoleEnum("role").notNull().default("USER"),
  password: text("password"),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  sessionToken: text("sessionToken").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const userRecords = pgTable("user_records", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  record_id: text("record_id").notNull(),
  zone_id: text("zone_id").notNull(),
  zone_name: text("zone_name").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  proxiable: boolean("proxiable"),
  proxied: boolean("proxied"),
  ttl: integer("ttl"),
  comment: text("comment"),
  tags: text("tags").notNull(),
  created_on: timestamp("created_on", { mode: "date", withTimezone: true }),
  modified_on: timestamp("modified_on", { mode: "date", withTimezone: true }),
  active: integer("active").default(1),
});

export const userUrls = pgTable("user_urls", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userName: text("userName").notNull(),
  target: text("target").notNull(),
  url: text("url").notNull(),
  prefix: text("prefix").notNull(),
  visible: integer("visible").notNull().default(0),
  active: integer("active").notNull().default(1),
  expiration: text("expiration").notNull().default("-1"),
  password: text("password").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  urlIdx: uniqueIndex("user_urls_url_unique").on(table.url),
}));

export const urlMetas = pgTable("url_metas", {
  id: text("id").primaryKey(),
  urlId: text("urlId")
    .notNull()
    .references(() => userUrls.id, { onDelete: "cascade" }),
  click: integer("click").notNull().default(0),
  ip: text("ip").notNull().default("127.0.0.1"),
  city: text("city"),
  country: text("country"),
  region: text("region"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  referer: text("referer"),
  lang: text("lang"),
  device: text("device"),
  browser: text("browser"),
  engine: text("engine"),
  os: text("os"),
  cpu: text("cpu"),
  isBot: boolean("isBot").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scrapeMetas = pgTable("scrape_metas", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  link: text("link").notNull(),
  click: integer("click").notNull().default(0),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  apiKey: text("apiKey").notNull(),
  ip: text("ip").notNull().default("127.0.0.1"),
  city: text("city"),
  country: text("country"),
  region: text("region"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  referer: text("referer"),
  lang: text("lang"),
  device: text("device"),
  browser: text("browser"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const forwardEmails = pgTable("forward_emails", {
  id: text("id").primaryKey(),
  from: text("from").notNull(),
  fromName: text("fromName").notNull(),
  to: text("to").notNull(),
  subject: text("subject").default("No Subject"),
  text: text("text").default(""),
  html: text("html").default(""),
  date: text("date").default(""),
  messageId: text("messageId").default(""),
  replyTo: text("replyTo").default(""),
  cc: text("cc").default("[]"),
  headers: text("headers").default("[]"),
  attachments: text("attachments").default("[]"),
  readAt: timestamp("readAt", { mode: "date", withTimezone: true }),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userEmails = pgTable(
  "user_emails",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emailAddress: text("emailAddress").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deletedAt", { mode: "date", withTimezone: true }),
  },
  (table) => ({
    emailAddressActiveIdx: uniqueIndex("user_emails_email_address_active_unique")
      .on(table.emailAddress)
      .where(sql`${table.deletedAt} is null`),
  }),
);

export const userSendEmails = pgTable("user_send_emails", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  from: text("from").notNull(),
  fromName: text("fromName").default(""),
  to: text("to").notNull(),
  subject: text("subject").default("No Subject"),
  text: text("text").default(""),
  html: text("html").default(""),
  replyTo: text("replyTo").default(""),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const domains = pgTable("domains", {
  id: text("id").primaryKey(),
  domain_name: text("domain_name").notNull(),
  enable_short_link: boolean("enable_short_link").notNull().default(false),
  enable_email: boolean("enable_email").notNull().default(false),
  enable_dns: boolean("enable_dns").notNull().default(false),
  cf_zone_id: text("cf_zone_id"),
  cf_api_key: text("cf_api_key"),
  cf_email: text("cf_email"),
  cf_record_types: text("cf_record_types").notNull().default("CNAME,A,TXT"),
  cf_api_key_encrypted: boolean("cf_api_key_encrypted").notNull().default(false),
  email_provider: text("email_provider").notNull().default("resend"),
  resend_api_key: text("resend_api_key"),
  brevo_api_key: text("brevo_api_key"),
  max_short_links: integer("max_short_links"),
  max_email_forwards: integer("max_email_forwards"),
  max_dns_records: integer("max_dns_records"),
  min_url_length: integer("min_url_length").notNull().default(1),
  min_email_length: integer("min_email_length").notNull().default(1),
  min_record_length: integer("min_record_length").notNull().default(1),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const systemConfigs = pgTable("system_configs", {
  id: text("id").primaryKey(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  version: text("version").notNull().default("0.5.0"),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slTrackedClicks: integer("slTrackedClicks").notNull(),
  slNewLinks: integer("slNewLinks").notNull(),
  slAnalyticsRetention: integer("slAnalyticsRetention").notNull(),
  slDomains: integer("slDomains").notNull(),
  slAdvancedAnalytics: boolean("slAdvancedAnalytics").notNull(),
  slCustomQrCodeLogo: boolean("slCustomQrCodeLogo").notNull(),
  rcNewRecords: integer("rcNewRecords").notNull(),
  emEmailAddresses: integer("emEmailAddresses").notNull(),
  emDomains: integer("emDomains").notNull(),
  emSendEmails: integer("emSendEmails").notNull(),
  stMaxFileSize: text("stMaxFileSize").notNull().default("26214400"),
  stMaxTotalSize: text("stMaxTotalSize").notNull().default("524288000"),
  stMaxFileCount: integer("stMaxFileCount").notNull().default(1000),
  appSupport: text("appSupport").notNull(),
  appApiAccess: boolean("appApiAccess").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userFiles = pgTable("user_files", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  shortUrlId: text("shortUrlId"),
  name: text("name").notNull(),
  originalName: text("originalName"),
  mimeType: text("mimeType").notNull(),
  size: doublePrecision("size").notNull(),
  path: text("path").notNull(),
  etag: text("etag"),
  storageClass: text("storageClass"),
  channel: text("channel").notNull(),
  platform: text("platform").notNull(),
  providerName: text("providerName").notNull(),
  bucket: text("bucket").notNull(),
  status: integer("status").notNull().default(1),
  lastModified: timestamp("lastModified", { mode: "date", withTimezone: true })
    .notNull(),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const schema = {
  user: authUser,
  session: authSession,
  account: authAccount,
  verification: authVerification,
  users,
  accounts,
  sessions,
  verificationTokens,
  userRecords,
  userUrls,
  urlMetas,
  scrapeMetas,
  forwardEmails,
  userEmails,
  userSendEmails,
  domains,
  systemConfigs,
  plans,
  userFiles,
};

export type Schema = typeof schema;
