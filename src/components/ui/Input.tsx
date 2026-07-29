import {
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  useId,
} from "react";

const fieldClass =
  "w-full rounded-app border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:border-border-hover focus:border-primary disabled:bg-surface-2 disabled:text-text-disabled";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string;
    /** Decorative leading icon (e.g. a search glyph). Purely visual — the field's accessible name still comes from `label`/`aria-label`, never from the icon. */
    icon?: ReactNode;
  }
>(function Input({ label, error, icon, className = "", id, ...props }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-text-muted"
          >
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${fieldClass} ${icon ? "pl-9" : ""}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
});

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
