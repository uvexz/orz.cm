import { urlMetas, userUrls } from "@/lib/db/schema";

export type UserRole = "ADMIN" | "USER";
export type UrlMetaRow = typeof urlMetas.$inferSelect;
export type UserUrlRow = typeof userUrls.$inferSelect;

export interface ShortUrlFormData {
  id?: string;
  userId: string;
  userName: string;
  target: string;
  url: string;
  prefix: string;
  visible: number;
  active: number;
  expiration: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
  user?: {
    name: string;
    email: string;
  };
}

export interface UserShortUrlInfo extends ShortUrlFormData {
  meta?: UrlMetaRow;
}

export interface UrlStatusStats {
  total: number;
  actived: number;
  disabled: number;
  expired: number;
  passwordprotected: number;
}

export type ShortUrlMetaInput = Omit<
  UrlMetaRow,
  "id" | "createdAt" | "updatedAt"
>;

export interface ShortUrlStatusRecord {
  id: string;
  userId: string;
  active: number;
  expiration: string;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
}
