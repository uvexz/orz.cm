import { and, desc, eq, isNotNull, isNull, like, ne, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { AppSessionUser } from "@/lib/auth/server";
import { forbidden, unauthorized } from "@/lib/api/errors";

import { hashPassword, verifyPassword } from "../password";

type UserRecord = typeof users.$inferSelect;
type CreateUserInput = Omit<
  typeof users.$inferInsert,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface UpdateUserForm
  extends Omit<UserRecord, "id" | "createdAt" | "updatedAt" | "emailVerified"> {}

export const getUserByEmail = async (email: string) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        emailVerified: users.emailVerified,
        active: users.active,
        team: users.team,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user;
  } catch {
    return null;
  }
};

export const getUserById = async (id: string) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user ?? null;
  } catch {
    return null;
  }
};

export const getUserRecordByEmail = async (email: string) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user ?? null;
  } catch {
    return null;
  }
};

export const createUser = async (data: CreateUserInput) => {
  const [user] = await db
    .insert(users)
    .values({
      id: data.id ?? crypto.randomUUID().replace(/-/g, ""),
      ...data,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
    })
    .returning();

  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
};

export const getAllUsers = async (
  page: number,
  size: number,
  email?: string,
  userName?: string,
) => {
  try {
    const conditions: SQL[] = [];

    if (email) {
      conditions.push(like(users.email, `%${email}%`));
    }
    if (userName) {
      conditions.push(like(users.name, `%${userName}%`));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * size;

    let totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .$dynamic();
    let listQuery = db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(size)
      .offset(offset)
      .$dynamic();

    if (whereClause) {
      totalQuery = totalQuery.where(whereClause);
      listQuery = listQuery.where(whereClause);
    }

    const [[totalResult], list] = await Promise.all([
      totalQuery,
      listQuery,
    ]);

    return {
      total: Number(totalResult?.count ?? 0),
      list,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};

export async function getAllUsersCount() {
  try {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    return Number(result?.count ?? 0);
  } catch (error) {
    return -1;
  }
}

export async function setFirstUserAsAdmin(userId: string) {
  try {
    const [user] = await db
      .update(users)
      .set({
        role: "ADMIN",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return user ?? null;
  } catch (error) {
    return null;
  }
}

export async function getAllUsersActiveApiKeyCount() {
  try {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(isNotNull(users.apiKey));

    return Number(result?.count ?? 0);
  } catch (error) {
    return -1;
  }
}

export const updateUser = async (userId: string, data: UpdateUserForm) => {
  try {
    // 1. 验证用户是否存在
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      throw new Error("用户不存在");
    }

    // 2. 准备更新数据
    const updateData: Partial<typeof users.$inferInsert> = {};

    // 3. 处理基础字段
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) {
      // 检查邮箱是否已被其他用户使用
      if (data.email !== existingUser.email) {
        const emailCondition =
          data.email === null ? isNull(users.email) : eq(users.email, data.email);
        const [emailExists] = await db
          .select({ id: users.id })
          .from(users)
          .where(and(emailCondition, ne(users.id, userId)))
          .limit(1);
        if (emailExists) {
          throw new Error("邮箱已被使用");
        }
      }
      updateData.email = data.email;
    }
    if (data.role !== undefined) updateData.role = data.role;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.team !== undefined) updateData.team = data.team;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.apiKey !== undefined) updateData.apiKey = data.apiKey;
    if (data.tgChatId !== undefined) updateData.tgChatId = data.tgChatId;
    if (data.tgUsername !== undefined) updateData.tgUsername = data.tgUsername;

    // 4. 处理密码更新
    if (data.password) {
      const trimmedPassword = data.password.trim();

      // 检查新密码是否与当前密码相同
      const isSamePassword = verifyPassword(
        trimmedPassword,
        existingUser.password || "",
      );

      if (!isSamePassword) {
        updateData.password = hashPassword(trimmedPassword);
      }
    }

    if (Object.keys(updateData).length === 0) {
      return existingUser;
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        active: users.active,
        team: users.team,
        image: users.image,
        apiKey: users.apiKey,
        tgChatId: users.tgChatId,
        tgUsername: users.tgUsername,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return updatedUser;
  } catch (error) {
    console.error("更新用户失败:", error);
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("更新用户时发生未知错误");
  }
};

export const deleteUserById = async (userId: string) => {
  try {
    const [user] = await db
      .update(users)
      .set({
        active: 0,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return user ?? null;
  } catch (error) {
    return null;
  }
};

export const updateUserTelegramBinding = async (
  userId: string,
  tgChatId: string,
  tgUsername?: string | null,
) => {
  const [user] = await db
    .update(users)
    .set({
      tgChatId,
      tgUsername: tgUsername ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      tgChatId: users.tgChatId,
      tgUsername: users.tgUsername,
    });

  return user ?? null;
};

export function checkUserStatus(user: AppSessionUser | null | undefined) {
  if (!user?.id) {
    throw unauthorized("Unauthorized");
  }
  if (user.active === 0) {
    throw forbidden("Forbidden");
  }
  return user;
}

export function getFirstAdminUser() {
  return db
    .select({ email: users.email })
    .from(users)
    .where(
      and(
        eq(users.role, "ADMIN"),
        isNotNull(users.email),
        ne(users.email, "admin@admin.com"),
      ),
    )
    .limit(1)
    .then(([user]) => user ?? null);
}
