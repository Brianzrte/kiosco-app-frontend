import { InputHTMLAttributes, SelectHTMLAttributes, useId } from "react";

const fieldClass =
  "w-full rounded-app border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled hover:border-border-hover focus:border-primary disabled:bg-surface-2 disabled:text-text-disabled";

export function Input({
  label,
  error,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}
      <input id={id} className={fieldClass} {...props} />
      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  error,
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}
      <select id={id} className={fieldClass} {...props}>
        {children}
      </select>
      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}
