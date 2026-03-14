import { userFiles } from "@/lib/db/schema";

export type UserFileRow = typeof userFiles.$inferSelect;

export interface UserFileData extends UserFileRow {
  user: {
    name: string;
    email: string;
  };
}

export interface CreateUserFileInput {
  userId: string;
  name: string;
  originalName?: string;
  mimeType: string;
  size: number;
  path: string;
  etag?: string;
  storageClass?: string;
  channel: string;
  platform: string;
  providerName: string;
  bucket: string;
  shortUrlId?: string;
  lastModified: Date;
}

export interface UpdateUserFileInput {
  name?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  path?: string;
  etag?: string;
  storageClass?: string;
  channel?: string;
  platform?: string;
  providerName?: string;
  bucket?: string;
  shortUrlId?: string;
  status?: number;
  lastModified?: Date;
}

export interface QueryUserFileOptions {
  bucket?: string;
  userId?: string;
  providerName?: string;
  status?: number;
  channel?: string;
  platform?: string;
  shortUrlId?: string;
  name?: string;
  size?: number;
  mimeType?: string;
  page?: number;
  limit?: number;
  orderBy?: "createdAt" | "lastModified" | "size";
  order?: "asc" | "desc";
}
