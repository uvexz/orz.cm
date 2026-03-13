import { auth } from "@/auth";

import { deleteUserById } from "@/lib/dto/user";

export async function DELETE() {
  const session = await auth();

  if (!session?.user) {
    return new Response("Not authenticated", { status: 401 });
  }

  const currentUser = session.user;
  if (!currentUser || !currentUser?.id) {
    return new Response("Invalid user", { status: 401 });
  }

  try {
    await deleteUserById(currentUser.id);
  } catch (error) {
    return new Response("Internal server error", { status: 500 });
  }

  return new Response("User deleted successfully!", { status: 200 });
}
