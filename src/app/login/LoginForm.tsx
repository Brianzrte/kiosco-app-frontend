"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { IconAlert, IconEye, IconEyeOff } from "@/components/ui/icons";
import { homeFor } from "@/lib/nav";
import { MOTION } from "@/lib/motion";
import { Role } from "@/lib/types";

/** Circle big enough to cover the viewport from any origin point on it. */
function coveringRadius(originX: number, originY: number) {
  const corners = [
    [0, 0],
    [window.innerWidth, 0],
    [0, window.innerHeight],
    [window.innerWidth, window.innerHeight],
  ];
  return Math.max(
    ...corners.map(([x, y]) => Math.hypot(x - originX, y - originY)),
  );
}

export function LoginForm() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Set only on a successful login. Its presence renders the full-screen
  // reveal that confirms success and connects this screen to the next one;
  // navigation happens in onAnimationComplete, not here, so the transition
  // is never cut short.
  const [reveal, setReveal] = useState<{
    x: number;
    y: number;
    radius: number;
  } | null>(null);
  const nextRoute = useRef<string>("/");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.message ?? "Error de autenticación");
        setPending(false);
        return;
      }
      nextRoute.current = homeFor(body.roles as Role[]);
      const rect = submitButtonRef.current?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      setReveal({ x, y, radius: coveringRadius(x, y) });
      // `pending` stays true on purpose: the form is about to be replaced
      // by the reveal + navigation, so it never goes back to interactive.
    } catch {
      setError("Error de red. Revisá tu conexión e intentá de nuevo.");
      setPending(false);
    }
  }

  return (
    <>
      <Card className="shadow-soft-lg">
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Input
            label="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
          <Input
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            endAdornment={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                aria-pressed={showPassword}
                className="flex size-7 items-center justify-center rounded-tight text-text-muted transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-2 hover:text-text-secondary"
              >
                {showPassword ? (
                  <IconEyeOff className="size-4" />
                ) : (
                  <IconEye className="size-4" />
                )}
              </button>
            }
          />
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-app border border-error/40 bg-error/10 px-3.5 py-2.5 text-sm font-medium text-error"
            >
              <IconAlert className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button ref={submitButtonRef} type="submit" pending={pending}>
            {pending ? "Ingresando…" : "Iniciar sesión"}
          </Button>
        </form>
      </Card>

      <AnimatePresence>
        {reveal && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-50 bg-primary-active"
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : {
                    clipPath: `circle(0px at ${reveal.x}px ${reveal.y}px)`,
                  }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : {
                    clipPath: `circle(${reveal.radius}px at ${reveal.x}px ${reveal.y}px)`,
                  }
            }
            transition={{
              duration: (shouldReduceMotion ? MOTION.fast : MOTION.slow) / 1000,
              ease: [0.16, 1, 0.3, 1],
            }}
            onAnimationComplete={() => {
              router.push(nextRoute.current);
              router.refresh();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
