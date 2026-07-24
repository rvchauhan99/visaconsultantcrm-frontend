import { forwardRef, useId, useState } from "react";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════
   Field — label + slot wrapper
════════════════════════════════════ */

export function Field({ label, hint, error, required, className, children }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="block text-sm font-medium text-ink leading-none">
          {label}
          {required && <span className="ml-1 text-danger text-xs">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-xs text-danger flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-ink-muted">{hint}</p>
      )}
    </div>
  );
}

/* ════════════════════════════════════
   FloatField — floating label input
════════════════════════════════════ */

export const FloatField = forwardRef(function FloatField(
  { label, hint, error, className, type = "text", prefixIcon: PrefixIcon, suffixIcon: SuffixIcon, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  const hasValue = Boolean(props.value || props.defaultValue);
  const lifted = focused || hasValue;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "relative rounded-[14px] border transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] bg-surface-card",
          focused
            ? "border-navy shadow-[0_0_0_4px_var(--glow-navy)]"
            : error
            ? "border-danger shadow-[0_0_0_3px_rgba(155,61,50,0.12)]"
            : "border-border hover:border-border-strong",
        )}
      >
        {PrefixIcon && (
          <div className={cn(
            "absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors",
            focused ? "text-navy" : "text-ink-muted",
          )}>
            <PrefixIcon className="w-4 h-4" />
          </div>
        )}

        <input
          id={id}
          ref={ref}
          type={type}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            "w-full bg-transparent outline-none font-sans text-sm text-ink",
            "transition-all duration-[280ms]",
            PrefixIcon ? "pl-10 pr-4" : "px-4",
            SuffixIcon ? "pr-10" : "",
            label ? (lifted ? "pt-5 pb-2" : "py-3.5") : "py-3.5",
          )}
          placeholder=" "
          {...props}
        />

        {label && (
          <label
            htmlFor={id}
            className={cn(
              "absolute pointer-events-none font-sans transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
              PrefixIcon ? "left-10" : "left-4",
              lifted
                ? "top-2 text-[11px] font-semibold tracking-wide text-navy"
                : "top-1/2 -translate-y-1/2 text-sm text-ink-muted",
            )}
          >
            {label}
          </label>
        )}

        {SuffixIcon && (
          <div className={cn(
            "absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors",
            focused ? "text-navy" : "text-ink-muted",
          )}>
            <SuffixIcon className="w-4 h-4" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-danger flex items-center gap-1 pl-1">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-ink-muted pl-1">{hint}</p>
      )}
    </div>
  );
});

/* ════════════════════════════════════
   Input — standard styled input
════════════════════════════════════ */

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full px-4 py-3 rounded-[14px] border border-border bg-surface-card",
        "font-sans text-sm text-ink placeholder:text-ink-muted",
        "outline-none transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        "focus:border-navy focus:shadow-[0_0_0_4px_var(--glow-navy)]",
        "hover:border-border-strong",
        className,
      )}
      {...props}
    />
  );
});

/* ════════════════════════════════════
   Select
════════════════════════════════════ */

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full px-4 py-3 rounded-[14px] border border-border bg-surface-card",
        "font-sans text-sm text-ink",
        "outline-none transition-all duration-[280ms]",
        "focus:border-navy focus:shadow-[0_0_0_4px_var(--glow-navy)]",
        "hover:border-border-strong cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

/* ════════════════════════════════════
   Textarea
════════════════════════════════════ */

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full px-4 py-3 rounded-[14px] border border-border bg-surface-card",
        "font-sans text-sm text-ink placeholder:text-ink-muted",
        "outline-none transition-all duration-[280ms] resize-none",
        "focus:border-navy focus:shadow-[0_0_0_4px_var(--glow-navy)]",
        "hover:border-border-strong",
        className,
      )}
      {...props}
    />
  );
});
