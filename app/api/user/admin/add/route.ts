import { checkUserStatus, createUser, getUserRecordByEmail } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";

export async function POST(req: Request) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;
    if (user.role !== "ADMIN") {
      return Response.json("Unauthorized", {
        status: 401,
      });
    }

    const { email, password, name, team } = await req.json();
    if (!email || !password) {
      return Response.json("email and password is required", { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const has_user = await getUserRecordByEmail(normalizedEmail);

    if (has_user) {
      return Response.json("User already exists", { status: 400 });
    }

    const newUser = await createUser({
      name,
      email: normalizedEmail,
      password: hashPassword(password),
      active: 1,
      role: "USER",
      team,
    });
    return Response.json(newUser.id, { status: 200 });
  } catch (error) {
    return Response.json({ statusText: "Server error" }, { status: 500 });
  }
}
