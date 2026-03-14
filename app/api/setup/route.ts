import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { isApiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/api/route";
import {
  getAllUsersCount,
  setFirstUserAsAdmin,
} from "@/lib/dto/user";

export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
  try {
    const user = await requireUser();

    const count = await getAllUsersCount();

    if (count === 1 && user.role === "USER") {
      const res = await setFirstUserAsAdmin(user.id);
      if (res) {
        return Response.json({ admin: res.role === "ADMIN" }, { status: 201 });
      }
      return Response.json({ admin: false }, { status: 400 });
    }

    return redirect("/admin");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (isApiError(error)) {
      return Response.json(error.body, {
        status: error.status,
      });
    }

    return Response.json("Server error", { status: 500 });
  }
}
