import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api", () => {
  it("returns the parsed body on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { ok: true })),
    );
    await expect(api("/products")).resolves.toEqual({ ok: true });
  });

  it("classifies a rejected fetch as a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fail")));
    await expect(api("/products")).rejects.toMatchObject({
      kind: "network",
      message: "No se pudo conectar con el servidor. Revisá tu conexión.",
    });
  });

  it("classifies an abort as a timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")),
    );
    await expect(api("/products")).rejects.toMatchObject({
      kind: "timeout",
      message: "El servidor tardó demasiado en responder.",
    });
  });

  it("classifies a 5xx with no body as a server error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("<html>502</html>", { status: 502 })),
    );
    await expect(api("/products")).rejects.toMatchObject({
      kind: "server",
      status: 502,
      message:
        "El servidor tuvo un problema. Volvé a intentar en unos segundos.",
    });
  });

  it("lets the backend message win over the 5xx transport classification", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(500, { message: "Stock insuficiente" }),
        ),
    );
    await expect(api("/sales")).rejects.toMatchObject({
      kind: "message",
      message: "Stock insuficiente",
    });
  });

  it("classifies a 403 with no body as forbidden, without redirecting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 403 })),
    );
    await expect(api("/reports/sales")).rejects.toMatchObject({
      kind: "forbidden",
      status: 403,
      message: "No tenés permisos para esta acción.",
    });
  });

  it("lets the backend message win over the 403 transport classification", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(403, { message: "Rol sin acceso a reportes" }),
        ),
    );
    await expect(api("/reports/sales")).rejects.toMatchObject({
      kind: "message",
      message: "Rol sin acceso a reportes",
    });
  });

  it("classifies a 401 as unauthorized", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 401 })),
    );
    await expect(api("/products")).rejects.toMatchObject({
      kind: "unauthorized",
      status: 401,
      message: "Tu sesión expiró.",
    });
  });

  it("throws an ApiError instance in every failure path", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fail")));
    await expect(api("/products")).rejects.toBeInstanceOf(ApiError);
  });
});
