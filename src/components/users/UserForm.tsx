"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import { ROLE_OPTIONS } from "@/lib/roleMeta";
import { Role } from "@/lib/types";

export function UserForm() {
  const router = useRouter();
  const toast = useToast();
  const usernameRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("cashier");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setUsernameError(null);
    setFormError(null);
    setPending(true);
    try {
      await api("/users", {
        method: "POST",
        body: {
          username: username.trim(),
          password,
          roles: [role],
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          address: address.trim(),
        },
      });
      setPassword("");
      toast("success", "Usuario creado");
      router.push("/users");
      router.refresh();
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status === 409) {
        setUsernameError(apiError.message);
        usernameRef.current?.focus();
      } else {
        setFormError(apiError.message);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="max-w-3xl">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            ref={usernameRef}
            label="Usuario"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            error={usernameError ?? undefined}
            required
            autoFocus
          />
          <div>
            <Input
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="mt-2 text-sm font-medium text-primary hover:text-primary-hover"
            >
              {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            </button>
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Rol</legend>
          <div className="grid gap-3 md:grid-cols-2">
            {ROLE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-app border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                  role === option.value
                    ? "border-primary bg-primary-light/50"
                    : "border-border hover:border-border-hover"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value)}
                  className="sr-only"
                />
                <span className="block text-sm font-medium">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-text-secondary">
                  {option.description}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Nombre"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            autoFocus={false}
          />
          <Input
            label="Apellido"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
          <Input
            label="Teléfono"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <Input
            label="Dirección"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </div>

        {formError && (
          <p role="alert" className="text-sm text-error">
            {formError}
          </p>
        )}

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={!username.trim() || !password}
            pending={pending}
          >
            {pending ? "Guardando…" : "Crear usuario"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/users")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
