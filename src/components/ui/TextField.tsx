import { InputHTMLAttributes, forwardRef } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, id, className = "", ...props },
  ref
) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={`rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20 dark:border-white/15 dark:bg-white/5 dark:text-white ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
});
