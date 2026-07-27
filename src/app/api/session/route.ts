import { NextRequest, NextResponse } from "next/server";
import {
  BACKEND_URL,
  ROLE_COOKIE,
  TOKEN_COOKIE,
  USERNAME_COOKIE,
} from "@/lib/session";

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function POST(request: NextRequest) {
  const credentials = await request.json();

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
  } catch {
    return NextResponse.json(
      { message: "No se pudo conectar con el servidor. Verificá que esté en línea." },
      { status: 502 },
    );
  }

  const body = await backendResponse.json().catch(() => ({}));
  if (!backendResponse.ok) {
    return NextResponse.json(
      { message: body.message ?? "Error de autenticación" },
      { status: backendResponse.status },
    );
  }

  const expires = new Date(body.expires_at);
  const response = NextResponse.json({ role: body.role });
  response.cookies.set(TOKEN_COOKIE, body.token, { ...cookieBase, expires });
  response.cookies.set(ROLE_COOKIE, body.role, { ...cookieBase, expires });
  response.cookies.set(USERNAME_COOKIE, credentials.username, {
    ...cookieBase,
    expires,
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (token) {
    await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(TOKEN_COOKIE);
  response.cookies.delete(ROLE_COOKIE);
  response.cookies.delete(USERNAME_COOKIE);
  return response;
}
