import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import ApiReference from "@/components/shared/api-reference";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { CodeLight } from "../../../(protected)/dashboard/scrape/scrapes";

export const metadata = constructMetadata({
  title: "Email API",
  description: "Create and manage mailbox resources through the email API.",
});

export default async function EmailApiPage() {
  const user = await getCurrentUser();

  if (!user?.id) redirect("/login");
  const t = await getTranslations("Email");

  return (
    <div className="h-[calc(100vh-60px)] w-full overflow-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 xl:p-8">
        <ApiReference
          badge="POST /api/v1/email"
          target="creating email boxes"
        />

        <Card>
          <CardHeader>
            <Badge className="w-fit">POST /api/v1/email</Badge>
            <CardTitle>{t("Create emails via API")}</CardTitle>
            <CardDescription>{t("ApiCreateDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeLight
              content={`
curl -X POST \\
  -H "Content-Type: application/json" \\
  -H "wrdo-api-key: YOUR_API_KEY" \\
  -d '{
    "emailAddress": "demo@orz.email"
  }' \\
  https://orz.cm/api/v1/email
              `}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge className="w-fit">GET /api/v1/email/inbox</Badge>
            <CardTitle>{t("Fetch inbox via API")}</CardTitle>
            <CardDescription>{t("ApiInboxDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeLight
              content={`
curl -X GET \\
  -H "wrdo-api-key: YOUR_API_KEY" \\
  "https://orz.cm/api/v1/email/inbox?emailAddress=demo@orz.email&page=1&size=10"
              `}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge className="w-fit">DELETE /api/v1/email/message</Badge>
            <CardTitle>{t("Delete inbox messages via API")}</CardTitle>
            <CardDescription>{t("ApiDeleteDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeLight
              content={`
curl -X DELETE \\
  -H "Content-Type: application/json" \\
  -H "wrdo-api-key: YOUR_API_KEY" \\
  -d '{
    "emailId": "EMAIL_MESSAGE_ID"
  }' \\
  https://orz.cm/api/v1/email/message
              `}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
