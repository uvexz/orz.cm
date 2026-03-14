UPDATE "user_emails"
SET
  "emailAddress" = lower(trim("emailAddress")),
  "updatedAt" = now()
WHERE "emailAddress" <> lower(trim("emailAddress"));
--> statement-breakpoint
WITH duplicate_active_emails AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY "emailAddress"
      ORDER BY "createdAt" ASC, id ASC
    ) AS row_num
  FROM "user_emails"
  WHERE "deletedAt" IS NULL
)
UPDATE "user_emails"
SET
  "deletedAt" = now(),
  "updatedAt" = now()
WHERE id IN (
  SELECT id
  FROM duplicate_active_emails
  WHERE row_num > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_emails_email_address_active_unique" ON "user_emails" USING btree ("emailAddress") WHERE "user_emails"."deletedAt" is null;
