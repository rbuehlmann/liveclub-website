import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand-red text-white hover:bg-brand-red-hover disabled:bg-brand-red/40",
  secondary: "bg-brand-silver/25 text-gray-900 hover:bg-brand-silver/40 disabled:bg-gray-100 disabled:text-gray-400 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:disabled:bg-white/5 dark:disabled:text-gray-500",
  // Kept as a plain, muted red distinct from brand-red so destructive
  // actions never look like the primary "live/action" brand color.
  danger: "bg-red-800 text-white hover:bg-red-900 disabled:bg-red-300",
  ghost: "bg-transparent text-brand-red hover:bg-brand-red/10 disabled:text-gray-400",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", fullWidth, className = "", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-lg px-5 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed ${
        variantClasses[variant]
      } ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
});
