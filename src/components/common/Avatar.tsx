import clsx from "clsx";

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-sm";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center rounded-full bg-primary/20 text-primary font-semibold ring-1 ring-primary/30",
        dim,
        className,
      )}
      aria-label={name}
    >
      {initials || "?"}
    </span>
  );
}
