"use client";

import { ROLE_OPTIONS } from "@/lib/roleMeta";
import { Role } from "@/lib/types";

export function RolesField({
  roles,
  onChange,
}: {
  roles: Role[];
  onChange: (roles: Role[]) => void;
}) {
  function toggle(role: Role) {
    onChange(
      roles.includes(role)
        ? roles.filter((current) => current !== role)
        : [...roles, role],
    );
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium">Roles</legend>
      <p className="text-sm text-text-secondary">
        Elegí todos los permisos que necesita esta persona.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {ROLE_OPTIONS.map((role) => (
          <label
            key={role.value}
            className="flex cursor-pointer items-start gap-3 rounded-app border border-border p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"
          >
            <input
              type="checkbox"
              checked={roles.includes(role.value)}
              onChange={() => toggle(role.value)}
              className="mt-1 size-4 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium">{role.label}</span>
              <span className="mt-1 block text-xs leading-5 text-text-secondary">
                {role.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
