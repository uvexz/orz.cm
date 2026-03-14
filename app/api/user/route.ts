import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { deleteUserById } from "@/lib/dto/user";

export const DELETE = createAuthedApiRoute(
  async (_request: Request, _context: AppRouteHandlerContext, { user }) => {
    await deleteUserById(user.id);
    return apiOk("User deleted successfully!");
  },
  {
    fallbackBody: "Internal server error",
  },
);
