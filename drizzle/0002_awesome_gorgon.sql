UPDATE "user_urls"
SET
  "url" = trim("url"),
  "prefix" = lower(trim("prefix")),
  "target" = trim("target"),
  "password" = trim("password"),
  "updated_at" = now()
WHERE
  "url" <> trim("url")
  OR "prefix" <> lower(trim("prefix"))
  OR "target" <> trim("target")
  OR "password" <> trim("password");
--> statement-breakpoint
WITH duplicate_short_urls AS (
  SELECT
    id,
    "url",
    row_number() OVER (
      PARTITION BY "url"
      ORDER BY "created_at" ASC, id ASC
    ) AS row_num
  FROM "user_urls"
)
UPDATE "user_urls"
SET
  "url" = duplicate_short_urls."url" || '-' || duplicate_short_urls.id,
  "updated_at" = now()
FROM duplicate_short_urls
WHERE
  "user_urls".id = duplicate_short_urls.id
  AND duplicate_short_urls.row_num > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX "user_urls_url_unique" ON "user_urls" USING btree ("url");
