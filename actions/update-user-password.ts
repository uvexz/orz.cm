"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";

import { syncBetterAuthCredentialForAppUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";
import { userPasswordSchema } from "@/lib/validations/user";

export type FormData = {
  password: string;
};

export async function updateUserPassword(userId: string, data: FormData) {
  try {
    const session = await auth();

    if (!session?.user || session?.user.id !== userId) {
      throw new Error("Unauthorized");
    }

    const { password } = userPasswordSchema.parse(data);
    const passwordHash = hashPassword(password);

    await db
      .update(users)
      .set({
        password: passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await syncBetterAuthCredentialForAppUser(userId, passwordHash);

    revalidatePath("/dashboard/settings");
    return { status: "success" };
  } catch (error) {
    // console.log(error)
    return { status: "error" };
  }
}
