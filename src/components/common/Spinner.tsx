import clsx from "clsx";

export function Spinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dim = size === "sm" ? "h-4 w-4 border-2" : size === "lg" ? "h-10 w-10 border-[3px]" : "h-6 w-6 border-2";
  return (
    <span
      className={clsx(
        "inline-block rounded-full animate-spin border-current border-t-transparent text-primary",
        dim,
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
