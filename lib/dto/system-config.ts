import { asc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { CACHE_TTL, delCache, getCache, setCache } from "@/lib/cache";

import { db } from "../db";
import { systemConfigs } from "../db/schema";

export type ConfigType = "BOOLEAN" | "STRING" | "NUMBER" | "OBJECT";

export type SystemConfigValue =
  | string
  | number
  | boolean
  | null
  | SystemConfigValue[]
  | { [key: string]: SystemConfigValue };

export interface SystemConfigData<TValue = SystemConfigValue> {
  key: string;
  value: TValue; // 解析后的实际值
  type: ConfigType;
  description?: string;
  version?: string;
}

export interface CreateSystemConfigData<TValue = SystemConfigValue> {
  key: string;
  value: TValue;
  type: ConfigType;
  description?: string;
  version?: string;
}

export interface UpdateSystemConfigData<TValue = SystemConfigValue> {
  value?: TValue;
  type?: ConfigType;
  description?: string;
  version?: string;
}

type SystemConfigRow = typeof systemConfigs.$inferSelect;
type MissingSystemConfigCacheValue = { missing: true };
type SystemConfigCacheValue = SystemConfigData | MissingSystemConfigCacheValue;

const DEFAULT_SYSTEM_CONFIG_VALUES = {
  enable_user_registration: true,
  enable_subdomain_apply: false,
  system_notification: false,
  enable_github_oauth: false,
  enable_google_oauth: false,
  enable_liunxdo_oauth: false,
  enable_resend_email_login: false,
  enable_email_password_login: true,
  enable_email_catch_all: false,
  catch_all_emails: "",
  enable_tg_email_push: false,
  tg_email_bot_token: "",
  tg_email_chat_id: "",
  tg_email_template: "",
  tg_email_target_white_list: "",
  enable_email_registration_suffix_limit: false,
  email_registration_suffix_limit_white_list: "",
  enable_subdomain_status_email_pusher: false,
  enable_email_forward: false,
  email_forward_targets: "",
  email_forward_white_list: "",
} as const;

function getDefaultConfigValue(key: string) {
  return DEFAULT_SYSTEM_CONFIG_VALUES[
    key as keyof typeof DEFAULT_SYSTEM_CONFIG_VALUES
  ];
}

// 解析配置值
function parseConfigValue(value: string, type: ConfigType): SystemConfigValue {
  switch (type) {
    case "BOOLEAN":
      return value === "true";
    case "NUMBER":
      return Number(value);
    case "OBJECT":
      try {
        return JSON.parse(value);
      } catch (e) {
        console.error(e);
        return {};
      }
    case "STRING":
    default:
      // 如果是 JSON 字符串格式的字符串，需要解析
      if (value.startsWith('"') && value.endsWith('"')) {
        return JSON.parse(value);
      }
      return value;
  }
}

// 序列化配置值
function serializeConfigValue(value: unknown, type: ConfigType): string {
  switch (type) {
    case "BOOLEAN":
      return String(Boolean(value));
    case "NUMBER":
      return String(Number(value));
    case "OBJECT":
      return JSON.stringify(value);
    case "STRING":
    default:
      return JSON.stringify(value);
  }
}

function toSystemConfigData(config: SystemConfigRow): SystemConfigData {
  return {
    key: config.key,
    value: parseConfigValue(config.value, config.type as ConfigType),
    type: config.type as ConfigType,
    description: config.description || undefined,
    version: config.version,
  };
}

function getSystemConfigCacheKey(key: string) {
  return `system-config:${key}`;
}

function isMissingSystemConfigCacheValue(
  value: SystemConfigCacheValue,
): value is MissingSystemConfigCacheValue {
  return "missing" in value;
}

async function readSystemConfigCacheValue(
  key: string,
): Promise<SystemConfigCacheValue | null> {
  return getCache<SystemConfigCacheValue>(getSystemConfigCacheKey(key));
}

async function writeSystemConfigCacheValue(
  key: string,
  value: SystemConfigCacheValue,
): Promise<SystemConfigCacheValue> {
  await setCache(getSystemConfigCacheKey(key), value, CACHE_TTL.dto);
  return value;
}

async function loadSystemConfigCacheValue(
  key: string,
): Promise<SystemConfigCacheValue> {
  const [config] = await db
    .select()
    .from(systemConfigs)
    .where(eq(systemConfigs.key, key))
    .limit(1);

  if (!config) {
    return writeSystemConfigCacheValue(key, { missing: true });
  }

  return writeSystemConfigCacheValue(key, toSystemConfigData(config));
}

async function getSystemConfigCacheValue(
  key: string,
): Promise<SystemConfigCacheValue> {
  const cachedValue = await readSystemConfigCacheValue(key);
  if (cachedValue !== null) {
    return cachedValue;
  }

  return loadSystemConfigCacheValue(key);
}

async function invalidateSystemConfigCache(key: string) {
  await delCache(getSystemConfigCacheKey(key));
}

// 获取单个配置
export async function getSystemConfig(
  key: string,
): Promise<SystemConfigData | null> {
  const config = await getSystemConfigCacheValue(key);
  return isMissingSystemConfigCacheValue(config) ? null : config;
}

// 获取配置值（简化版本，直接返回解析后的值）
export async function getConfigValue<T = SystemConfigValue>(
  key: string,
): Promise<T | null> {
  const config = await getSystemConfig(key);
  if (config) {
    return config.value as T;
  }

  const defaultValue = getDefaultConfigValue(key);
  return defaultValue === undefined ? null : (defaultValue as T);
}

// 获取所有配置
export async function getAllSystemConfigs(): Promise<SystemConfigData[]> {
  const configs = await db
    .select()
    .from(systemConfigs)
    .orderBy(asc(systemConfigs.key));

  return configs.map(toSystemConfigData);
}

// 获取配置的原始数据（包含元数据）
export async function getSystemConfigRaw(key: string) {
  const [config] = await db
    .select()
    .from(systemConfigs)
    .where(eq(systemConfigs.key, key))
    .limit(1);

  return config ?? null;
}

// 创建配置
export async function createSystemConfig(data: CreateSystemConfigData) {
  const serializedValue = serializeConfigValue(data.value, data.type);

  const [config] = await db
    .insert(systemConfigs)
    .values({
      id: crypto.randomUUID(),
      key: data.key,
      value: serializedValue,
      type: data.type,
      description: data.description,
      version: data.version || "0.5.0",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  await invalidateSystemConfigCache(data.key);
  return config ?? null;
}

// 更新配置
export async function updateSystemConfig(
  key: string,
  data: UpdateSystemConfigData,
) {
  const currentConfig =
    data.value !== undefined && !data.type ? await getSystemConfigRaw(key) : null;

  const nextType = (data.type ?? currentConfig?.type) as ConfigType | undefined;
  const updateData: Partial<typeof systemConfigs.$inferInsert> = {};

  if (data.value !== undefined && nextType) {
    updateData.value = serializeConfigValue(data.value, nextType);
  }
  if (data.type !== undefined) {
    updateData.type = data.type;
  }
  if (data.description !== undefined) {
    updateData.description = data.description;
  }
  if (data.version !== undefined) {
    updateData.version = data.version;
  }
  updateData.updatedAt = new Date();

  const [config] = await db
    .update(systemConfigs)
    .set(updateData)
    .where(eq(systemConfigs.key, key))
    .returning();

  await invalidateSystemConfigCache(key);
  return config ?? null;
}

// 设置配置值（upsert操作）
export async function setSystemConfig(
  key: string,
  value: SystemConfigValue,
  type: ConfigType,
  description?: string,
) {
  const serializedValue = serializeConfigValue(value, type);
  const existingConfig = await getSystemConfigRaw(key);

  if (existingConfig) {
    const [updatedConfig] = await db
      .update(systemConfigs)
      .set({
        value: serializedValue,
        type,
        description,
        updatedAt: new Date(),
      })
      .where(eq(systemConfigs.key, key))
      .returning();

    await invalidateSystemConfigCache(key);
    return updatedConfig ?? null;
  }

  const [createdConfig] = await db
    .insert(systemConfigs)
    .values({
      id: crypto.randomUUID(),
      key,
      value: serializedValue,
      type,
      description,
      version: "0.5.0",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  await invalidateSystemConfigCache(key);
  return createdConfig ?? null;
}

// 删除配置
export async function deleteSystemConfig(key: string) {
  const [config] = await db
    .delete(systemConfigs)
    .where(eq(systemConfigs.key, key))
    .returning();

  await invalidateSystemConfigCache(key);
  return config ?? null;
}

// 批量获取配置
export async function getMultipleConfigs<
  TConfigs extends Record<string, SystemConfigValue> = Record<
    string,
    SystemConfigValue
  >,
>(
  keys: string[],
): Promise<TConfigs> {
  if (keys.length === 0) {
    return {} as TConfigs;
  }

  const uniqueKeys = [...new Set(keys)];
  const cachedValues = await Promise.all(
    uniqueKeys.map(async (key) => [key, await readSystemConfigCacheValue(key)] as const),
  );

  const cachedMap = new Map(cachedValues);
  const missingKeys = uniqueKeys.filter((key) => cachedMap.get(key) === null);

  if (missingKeys.length > 0) {
    const configs = await db
      .select()
      .from(systemConfigs)
      .where(inArray(systemConfigs.key, missingKeys));

    const configMap = new Map(configs.map((config) => [config.key, config]));

    await Promise.all(
      missingKeys.map(async (key) => {
        const config = configMap.get(key);
        const value: SystemConfigCacheValue = config
          ? toSystemConfigData(config)
          : { missing: true };
        cachedMap.set(key, await writeSystemConfigCacheValue(key, value));
      }),
    );
  }

  const result: Record<string, SystemConfigValue> = {};

  for (const key of uniqueKeys) {
    const config = cachedMap.get(key);
    if (!config || isMissingSystemConfigCacheValue(config)) {
      const defaultValue = getDefaultConfigValue(key);
      if (defaultValue !== undefined) {
        result[key] = defaultValue;
      }
      continue;
    }

    result[key] = config.value;
  }

  return result as TConfigs;
}

// 按类型获取配置
export async function getConfigsByType(
  type: ConfigType,
): Promise<SystemConfigData[]> {
  const configs = await db
    .select()
    .from(systemConfigs)
    .where(eq(systemConfigs.type, type))
    .orderBy(asc(systemConfigs.key));

  return configs.map(toSystemConfigData);
}

// 搜索配置
export async function searchConfigs(
  searchTerm: string,
): Promise<SystemConfigData[]> {
  const pattern = `%${searchTerm}%`;
  const configs = await db
    .select()
    .from(systemConfigs)
    .where(
      or(
        ilike(systemConfigs.key, pattern),
        ilike(systemConfigs.description, pattern),
      ),
    )
    .orderBy(asc(systemConfigs.key));

  return configs.map(toSystemConfigData);
}

// 配置是否存在
export async function configExists(key: string): Promise<boolean> {
  const [result] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(systemConfigs)
    .where(eq(systemConfigs.key, key));

  return Number(result?.count ?? 0) > 0;
}

// 获取配置统计
export async function getConfigStats() {
  const [[totalResult], byType] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(systemConfigs),
    db
      .select({
        type: systemConfigs.type,
        count: sql<number>`count(*)`,
      })
      .from(systemConfigs)
      .groupBy(systemConfigs.type),
  ]);

  return {
    total: Number(totalResult?.count ?? 0),
    byType: byType.reduce(
      (acc, item) => {
        acc[item.type] = Number(item.count ?? 0);
        return acc;
      },
      {} as Record<string, number>,
    ),
  };
}

/** Usage Example */

/**

 // 取单个配置值
const appName = await getConfigValue<string>('app_name');

// 设置配置
await setSystemConfig('maintenance_mode', true, 'BOOLEAN', 'Enable maintenance mode');

// 批量获取配置
const configs = await getMultipleConfigs(['app_name', 'maintenance_mode', 'api_rate_limit']);

// 搜索配置
const emailConfigs = await searchConfigs('email');

// 获取统计信息
const stats = await getConfigStats();
 
 */
