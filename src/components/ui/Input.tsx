import {
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  useId,
} from "react";

const fieldClass =
  "min-w-0 max-w-full w-full rounded-app border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:border-border-hover focus:border-primary disabled:bg-surface-2 disabled:text-text-disabled";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string;
    compact?: boolean;
    inline?: boolean;
    /** Decorative leading icon (e.g. a search glyph). Purely visual — the field's accessible name still comes from `label`/`aria-label`, never from the icon. */
    icon?: ReactNode;
    /** Interactive trailing control (e.g. the password show/hide toggle). Unlike `icon`, this can be a real button — it isn't marked aria-hidden. */
    endAdornment?: ReactNode;
  }
>(function Input(
  {
    label,
    error,
    icon,
    endAdornment,
    compact = false,
    inline = false,
    className = "",
    id,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy =
    [props["aria-describedby"], errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div
      className={`${inline ? "flex min-w-0 items-start gap-2" : "min-w-0"} ${className}`}
    >
      {label && (
        <label
          htmlFor={inputId}
          className={`${inline ? "mb-0 whitespace-nowrap pt-2.5" : "mb-1.5 block"} text-sm font-medium`}
        >
          {label}
        </label>
      )}
      <div className={`${inline ? "min-w-0 flex-1" : ""} relative`}>
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
          className={`${fieldClass} ${compact ? "px-2.5 py-2 text-xs" : ""} ${icon ? "pl-9" : ""} ${endAdornment ? "pr-11" : ""}`}
          {...props}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={describedBy}
        />
        {endAdornment && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            {endAdornment}
          </span>
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-sm text-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
});

export function Select({
  label,
  error,
  compact = false,
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  compact?: boolean;
}) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`${fieldClass} ${compact ? "px-2.5 py-2 text-xs" : ""}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}
