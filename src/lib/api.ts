export type ErrorKind =
  | "network"
  | "timeout"
  | "server"
  | "unauthorized"
  | "forbidden"
  | "message";

/**
 * Fixed Spanish vocabulary for failures that carry no backend `{ message }`.
 * A backend message always wins over this — see `api()` below.
 */
const TRANSPORT_TEXT: Record<Exclude<ErrorKind, "message">, string> = {
  network: "No se pudo conectar con el servidor. Revisá tu conexión.",
  timeout: "El servidor tardó demasiado en responder.",
  server: "El servidor tuvo un problema. Volvé a intentar en unos segundos.",
  unauthorized: "Tu sesión expiró.",
  forbidden: "No tenés permisos para esta acción.",
};

const REQUEST_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public kind: ErrorKind = "message",
  ) {
    super(message);
  }
}

/**
 * Typed client-side fetch against the authenticated backend proxy.
 * Parses `{ message }` errors; falls back to a fixed Spanish vocabulary for
 * failures without a parseable body (network, timeout, 5xx, 403). Redirects
 * to /login only on 401 — a 403 means the session is fine but the role
 * lacks permission, so it stays on the page.
 */
export async function api<T>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`/api/backend${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError(0, TRANSPORT_TEXT.timeout, "timeout");
    }
    throw new ApiError(0, TRANSPORT_TEXT.network, "network");
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    if (typeof window !== "undefined") window.location.assign("/login");
    throw new ApiError(401, TRANSPORT_TEXT.unauthorized, "unauthorized");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    if (body?.message) {
      throw new ApiError(response.status, body.message, "message");
    }
    if (response.status === 403) {
      throw new ApiError(403, TRANSPORT_TEXT.forbidden, "forbidden");
    }
    if (response.status >= 500) {
      throw new ApiError(response.status, TRANSPORT_TEXT.server, "server");
    }
    throw new ApiError(
      response.status,
      `Error inesperado (${response.status})`,
      "message",
    );
  }
  return body as T;
}
