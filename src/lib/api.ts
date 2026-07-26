export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Typed client-side fetch against the authenticated backend proxy.
 * Parses `{ message }` errors and redirects to /login on 401.
 */
export async function api<T>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/backend${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Error de red. Revisá tu conexión e intentá de nuevo.");
  }

  if (response.status === 401) {
    window.location.assign("/login");
    throw new ApiError(401, "Sesión expirada");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.message ?? `Error inesperado (${response.status})`,
    );
  }
  return body as T;
}
