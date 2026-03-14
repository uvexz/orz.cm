import { SiteConfig } from "types";
import { env } from "@/env.mjs";

const siteUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const emailR2Domain = env.NEXT_PUBLIC_EMAIL_R2_DOMAIN || "";
const supportEmail = env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@orz.cm";
const appName = env.NEXT_PUBLIC_APP_NAME || "Orz";

export const siteConfig: SiteConfig = {
  name: appName,
  description:
    "All-in-one domain platform with short links, temp email, file storage, and open APIs.",
  url: siteUrl,
  ogImage: `${siteUrl}/_static/og.jpg`,
  links: {
    twitter: "https://twitter.com/yesmoree",
    github: "https://github.com/oiov/wr.do",
    discord: "https://discord.gg/AHPQYuZu3m",
    oichat: "https://oi.wr.do",
  },
  mailSupport: supportEmail,
  emailR2Domain,
};
