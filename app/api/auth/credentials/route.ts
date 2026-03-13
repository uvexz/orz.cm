import { NextRequest } from "next/server";

import { syncBetterAuthCredentialForAppUser } from "@/lib/auth/server";
import { getMultipleConfigs } from "@/lib/dto/system-config";
import { createUser, getUserRecordByEmail } from "@/lib/dto/user";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return Response.json("email and password is required", { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await getUserRecordByEmail(normalizedEmail);

    if (!user) {
      const configs = await getMultipleConfigs(["enable_user_registration"]);
      if (!configs.enable_user_registration) {
        return Response.json("User registration is disabled", { status: 403 });
      }

      const newUser = await createUser({
        name: String(name || normalizedEmail.split("@")[0] || "User"),
        email: normalizedEmail,
        password: hashPassword(password),
        active: 1,
        role: "USER",
        team: "free",
      });

      await syncBetterAuthCredentialForAppUser(
        newUser.id,
        newUser.password || "",
      );

      return Response.json({ ok: true }, { status: 200 });
    } else {
      if (user.active === 0) {
        return Response.json(null, { status: 403 });
      }

      const passwordCorrect = verifyPassword(password, user.password || "");
      if (passwordCorrect) {
        await syncBetterAuthCredentialForAppUser(user.id, user.password || "");
        return Response.json({ ok: true }, { status: 200 });
      }
    }

    return Response.json(null, { status: 400 });
  } catch (error) {
    console.error("[Auth Error]", error);
    return Response.json(error.message || "Server error", { status: 500 });
  }
}
