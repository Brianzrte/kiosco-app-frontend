import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL, TOKEN_COOKIE } from "@/lib/session";

/**
 * Authenticated proxy to the Go backend. Client code calls
 * /api/backend/<path> and the session token (httpOnly cookie)
 * is attached server-side, so it never reaches browser JS.
 */
async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: "Sesión expirada" }, { status: 401 });
  }

  const { path } = await params;
  const url = new URL(
    `${BACKEND_URL}/api/v1/${path.join("/")}${request.nextUrl.search}`,
  );

  const headers: HeadersInit = { Authorization: `Bearer ${token}` };
  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    headers["Content-Type"] = "application/json";
    init.body = await request.text();
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(url, init);
  } catch {
    return NextResponse.json(
      { message: "No se pudo conectar con el servidor. Verificá que esté en línea." },
      { status: 502 },
    );
  }

  const body = await backendResponse.text();
  return new NextResponse(body, {
    status: backendResponse.status,
    headers: { "Content-Type": "application/json" },
  });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
};
