import crypto from "crypto";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * 验证密码
 * @param password 用户输入的密码
 * @param storedPassword 数据库中存储的加密密码
 * @returns 是否匹配
 */
export function verifyPassword(
  password: string,
  storedPassword: string,
): boolean {
  const [salt, hash] = storedPassword.split(":");
  const hashToVerify = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === hashToVerify;
}
