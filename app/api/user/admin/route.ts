import { badRequest } from "@/lib/api/errors";
import {
  apiOk,
  createAdminApiRoute,
  type AppRouteHandlerContext,
} from "@/lib/api/route";
import {
  createUser,
  deleteUserById,
  getAllUsers,
  getUserRecordByEmail,
  updateUser,
} from "@/lib/dto/user";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export const GET = createAdminApiRoute(
  async (req: Request, _context: AppRouteHandlerContext) => {
    const url = new URL(req.url);
    const page = url.searchParams.get("page");
    const size = url.searchParams.get("size");
    const email = url.searchParams.get("email") || "";
    const userName = url.searchParams.get("userName") || "";

    const data = await getAllUsers(
      Number(page || "1"),
      Number(size || "10"),
      email,
      userName,
    );

    return apiOk(data);
  },
  {
    fallbackBody: { statusText: "Server error" },
  },
);

export const POST = createAdminApiRoute(
  async (req: Request, _context: AppRouteHandlerContext) => {
    const { email, password, name, team } = await req.json();
    if (!email || !password) {
      throw badRequest("email and password is required");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const hasUser = await getUserRecordByEmail(normalizedEmail);
    if (hasUser) {
      throw badRequest("User already exists");
    }

    const newUser = await createUser({
      name,
      email: normalizedEmail,
      password: hashPassword(password),
      active: 1,
      role: "USER",
      team,
    });

    return apiOk(newUser.id);
  },
  {
    fallbackBody: { statusText: "Server error" },
  },
);

export const PUT = createAdminApiRoute(
  async (req: Request, _context: AppRouteHandlerContext) => {
    const { id, data } = await req.json();
    if (!id || !data) {
      throw badRequest("Invalid request body");
    }

    const res = await updateUser(id, {
      name: data.name,
      email: data.email,
      role: data.role,
      active: data.active,
      team: data.team,
      image: data.image,
      apiKey: data.apiKey,
      password: data.password,
      tgChatId: data.tgChatId,
      tgUsername: data.tgUsername,
    });

    if (!res?.id) {
      throw badRequest("An error occurred");
    }

    return apiOk("success");
  },
  {
    fallbackBody: { statusText: "Server error" },
  },
);

export const DELETE = createAdminApiRoute(
  async (req: Request, _context: AppRouteHandlerContext) => {
    const { id } = await req.json();
    if (!id) {
      throw badRequest("Id is required");
    }

    const res = await deleteUserById(id);
    if (!res?.id) {
      throw badRequest("An error occurred");
    }

    return apiOk("success");
  },
  {
    fallbackBody: { statusText: "Server error" },
  },
);
