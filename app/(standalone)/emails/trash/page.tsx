import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import TrashEmailList from "@/components/email/TrashEmailList";

export const metadata = constructMetadata({
  title: "Email Trash",
  description: "Review deleted email addresses and restore them when needed.",
});

export default async function EmailTrashPage() {
  const user = await getCurrentUser();

  if (!user?.id) redirect("/login");

  return <TrashEmailList />;
}
