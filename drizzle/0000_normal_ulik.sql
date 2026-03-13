CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'USER');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" text PRIMARY KEY NOT NULL,
	"domain_name" text NOT NULL,
	"enable_short_link" boolean DEFAULT false NOT NULL,
	"enable_email" boolean DEFAULT false NOT NULL,
	"enable_dns" boolean DEFAULT false NOT NULL,
	"cf_zone_id" text,
	"cf_api_key" text,
	"cf_email" text,
	"cf_record_types" text DEFAULT 'CNAME,A,TXT' NOT NULL,
	"cf_api_key_encrypted" boolean DEFAULT false NOT NULL,
	"email_provider" text DEFAULT 'resend' NOT NULL,
	"resend_api_key" text,
	"brevo_api_key" text,
	"max_short_links" integer,
	"max_email_forwards" integer,
	"max_dns_records" integer,
	"min_url_length" integer DEFAULT 1 NOT NULL,
	"min_email_length" integer DEFAULT 1 NOT NULL,
	"min_record_length" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forward_emails" (
	"id" text PRIMARY KEY NOT NULL,
	"from" text NOT NULL,
	"fromName" text NOT NULL,
	"to" text NOT NULL,
	"subject" text DEFAULT 'No Subject',
	"text" text DEFAULT '',
	"html" text DEFAULT '',
	"date" text DEFAULT '',
	"messageId" text DEFAULT '',
	"replyTo" text DEFAULT '',
	"cc" text DEFAULT '[]',
	"headers" text DEFAULT '[]',
	"attachments" text DEFAULT '[]',
	"readAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slTrackedClicks" integer NOT NULL,
	"slNewLinks" integer NOT NULL,
	"slAnalyticsRetention" integer NOT NULL,
	"slDomains" integer NOT NULL,
	"slAdvancedAnalytics" boolean NOT NULL,
	"slCustomQrCodeLogo" boolean NOT NULL,
	"rcNewRecords" integer NOT NULL,
	"emEmailAddresses" integer NOT NULL,
	"emDomains" integer NOT NULL,
	"emSendEmails" integer NOT NULL,
	"stMaxFileSize" text DEFAULT '26214400' NOT NULL,
	"stMaxTotalSize" text DEFAULT '524288000' NOT NULL,
	"stMaxFileCount" integer DEFAULT 1000 NOT NULL,
	"appSupport" text NOT NULL,
	"appApiAccess" boolean NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrape_metas" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"link" text NOT NULL,
	"click" integer DEFAULT 0 NOT NULL,
	"userId" text NOT NULL,
	"apiKey" text NOT NULL,
	"ip" text DEFAULT '127.0.0.1' NOT NULL,
	"city" text,
	"country" text,
	"region" text,
	"latitude" text,
	"longitude" text,
	"referer" text,
	"lang" text,
	"device" text,
	"browser" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionToken" text NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"version" text DEFAULT '0.5.0' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "url_metas" (
	"id" text PRIMARY KEY NOT NULL,
	"urlId" text NOT NULL,
	"click" integer DEFAULT 0 NOT NULL,
	"ip" text DEFAULT '127.0.0.1' NOT NULL,
	"city" text,
	"country" text,
	"region" text,
	"latitude" text,
	"longitude" text,
	"referer" text,
	"lang" text,
	"device" text,
	"browser" text,
	"engine" text,
	"os" text,
	"cpu" text,
	"isBot" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_emails" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"emailAddress" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_files" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"shortUrlId" text,
	"name" text NOT NULL,
	"originalName" text,
	"mimeType" text NOT NULL,
	"size" double precision NOT NULL,
	"path" text NOT NULL,
	"etag" text,
	"storageClass" text,
	"channel" text NOT NULL,
	"platform" text NOT NULL,
	"providerName" text NOT NULL,
	"bucket" text NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"lastModified" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_records" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"record_id" text NOT NULL,
	"zone_id" text NOT NULL,
	"zone_name" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"proxiable" boolean,
	"proxied" boolean,
	"ttl" integer,
	"comment" text,
	"tags" text NOT NULL,
	"created_on" timestamp with time zone,
	"modified_on" timestamp with time zone,
	"active" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "user_send_emails" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"from" text NOT NULL,
	"fromName" text DEFAULT '',
	"to" text NOT NULL,
	"subject" text DEFAULT 'No Subject',
	"text" text DEFAULT '',
	"html" text DEFAULT '',
	"replyTo" text DEFAULT '',
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_urls" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"userName" text NOT NULL,
	"target" text NOT NULL,
	"url" text NOT NULL,
	"prefix" text NOT NULL,
	"visible" integer DEFAULT 0 NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"expiration" text DEFAULT '-1' NOT NULL,
	"password" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp with time zone,
	"image" text,
	"active" integer DEFAULT 1 NOT NULL,
	"team" text DEFAULT 'free',
	"apiKey" text,
	"tgChatId" text,
	"tgUsername" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"password" text
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_metas" ADD CONSTRAINT "scrape_metas_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "url_metas" ADD CONSTRAINT "url_metas_urlId_user_urls_id_fk" FOREIGN KEY ("urlId") REFERENCES "public"."user_urls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_files" ADD CONSTRAINT "user_files_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_records" ADD CONSTRAINT "user_records_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_send_emails" ADD CONSTRAINT "user_send_emails_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_urls" ADD CONSTRAINT "user_urls_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");