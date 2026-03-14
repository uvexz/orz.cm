require("dotenv").config();
const postgres = require("postgres");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("Skipping user email normalization because DATABASE_URL is not defined.");
    return;
  }

  const sql = postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 1,
  });

  try {
    await sql`
      UPDATE "user_emails"
      SET
        "emailAddress" = lower(trim("emailAddress")),
        "updatedAt" = now()
      WHERE "emailAddress" <> lower(trim("emailAddress"))
    `;

    await sql`
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
      )
    `;

    await sql`
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
        OR "password" <> trim("password")
    `;

    await sql`
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
        AND duplicate_short_urls.row_num > 1
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Failed to normalize user email addresses:", error);
  process.exit(1);
});
