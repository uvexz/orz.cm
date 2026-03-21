export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body?: unknown, options?: ErrorOptions) {
    super(typeof body === "string" ? body : `Request failed with status ${status}`, options);
    this.name = "ApiError";
    this.status = status;
    this.body = body ?? this.message;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function hasErrorMessage(error: unknown, message: string) {
  return error instanceof Error && error.message === message;
}

export function hasErrorCode(error: unknown, code: string) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === code,
  );
}

export function badRequest(body: unknown = "Bad Request") {
  return new ApiError(400, body);
}

export function unauthorized(body: unknown = "Unauthorized") {
  return new ApiError(401, body);
}

export function forbidden(body: unknown = "Forbidden") {
  return new ApiError(403, body);
}

export function notFound(body: unknown = "Not Found") {
  return new ApiError(404, body);
}

export function conflict(body: unknown = "Conflict") {
  return new ApiError(409, body);
}
