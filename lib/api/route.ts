import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { AppSessionUser } from "@/lib/auth/server";
import { checkUserStatus } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";

import { ApiError, isApiError, unauthorized } from "./errors";

type ApiRouteContext = {
  user: AppSessionUser;
};

export type AppRouteHandlerContext<
  TParams extends Record<string, string> = Record<string, never>,
> = {
  params: Promise<TParams>;
};

type ApiRouteHandler<TParams extends Record<string, string>> = (
  request: NextRequest,
  context: AppRouteHandlerContext<TParams>,
  apiContext: ApiRouteContext,
) => Promise<Response> | Response;

type PublicApiRouteHandler<TParams extends Record<string, string>> = (
  request: NextRequest,
  context: AppRouteHandlerContext<TParams>,
) => Promise<Response> | Response;

type ErrorMapper = (error: unknown) => ApiError | Response | null | undefined;

type ApiRouteOptions = {
  fallbackBody?: unknown;
  fallbackStatus?: number;
  logMessage?: string;
  mapError?: ErrorMapper;
  requireAdmin?: boolean;
};

type QuotaResult =
  | {
      status: number;
      statusText: string;
    }
  | null;

export async function requireUser() {
  return checkUserStatus(await getCurrentUser());
}

export function ensureAdmin(user: AppSessionUser) {
  if (user.role !== "ADMIN") {
    throw unauthorized("Unauthorized");
  }
}

function toJsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function toErrorResponse(error: ApiError | Response) {
  if (error instanceof Response) {
    return error;
  }

  return toJsonResponse(error.body, error.status);
}

function handleRouteError(error: unknown, options: ApiRouteOptions) {
  const mappedError = options.mapError?.(error);
  if (mappedError) {
    return toErrorResponse(mappedError);
  }

  if (error instanceof Response) {
    return error;
  }

  if (isApiError(error)) {
    return toErrorResponse(error);
  }

  if (options.logMessage) {
    console.error(options.logMessage, error);
  }

  return toJsonResponse(
    options.fallbackBody ?? "Internal Server Error",
    options.fallbackStatus ?? 500,
  );
}

function createProtectedApiRoute<
  TParams extends Record<string, string> = Record<string, never>,
>(
  handler: ApiRouteHandler<TParams>,
  options: ApiRouteOptions = {},
) {
  return async (
    request: NextRequest,
    context: AppRouteHandlerContext<TParams>,
  ) => {
    try {
      const user = await requireUser();
      if (options.requireAdmin) {
        ensureAdmin(user);
      }

      return await handler(request, context, { user });
    } catch (error) {
      return handleRouteError(error, options);
    }
  };
}

export function createApiRoute<
  TParams extends Record<string, string> = Record<string, never>,
>(
  handler: PublicApiRouteHandler<TParams>,
  options: ApiRouteOptions = {},
) {
  return async (
    request: NextRequest,
    context: AppRouteHandlerContext<TParams>,
  ) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleRouteError(error, options);
    }
  };
}

export function createAuthedApiRoute<
  TParams extends Record<string, string> = Record<string, never>,
>(
  handler: ApiRouteHandler<TParams>,
  options: Omit<ApiRouteOptions, "requireAdmin"> = {},
) {
  return createProtectedApiRoute(handler, options);
}

export function createAdminApiRoute<
  TParams extends Record<string, string> = Record<string, never>,
>(
  handler: ApiRouteHandler<TParams>,
  options: Omit<ApiRouteOptions, "requireAdmin"> = {},
) {
  return createProtectedApiRoute(handler, {
    ...options,
    requireAdmin: true,
  });
}

export function apiOk(body: unknown, status = 200) {
  return toJsonResponse(body, status);
}

export function apiCreated(body: unknown) {
  return toJsonResponse(body, 201);
}

export function apiNoContent() {
  return new Response(null, { status: 204 });
}

export function assertNoQuota(limit: QuotaResult) {
  if (limit) {
    throw new ApiError(limit.status, limit.statusText);
  }
}
