import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  /** Override the hash seed (defaults to `name`). Useful when several
   * customers share a first name and we want stable color from id. */
  seed?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

// Palette tuned for dark theme: low-saturation backgrounds that pair
// with white-ish text. Kept short on purpose so collisions are rare
// but readable.
const PALETTE = [
  "bg-rose-500/25 text-rose-200 ring-rose-500/40",
  "bg-amber-500/25 text-amber-200 ring-amber-500/40",
  "bg-emerald-500/25 text-emerald-200 ring-emerald-500/40",
  "bg-cyan-500/25 text-cyan-200 ring-cyan-500/40",
  "bg-violet-500/25 text-violet-200 ring-violet-500/40",
  "bg-pink-500/25 text-pink-200 ring-pink-500/40",
  "bg-orange-500/25 text-orange-200 ring-orange-500/40",
  "bg-lime-500/25 text-lime-200 ring-lime-500/40",
  "bg-sky-500/25 text-sky-200 ring-sky-500/40",
  "bg-fuchsia-500/25 text-fuchsia-200 ring-fuchsia-500/40",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, photoUrl, size = "md", className, seed }: AvatarProps) {
  const initials = getInitials(name);
  const colorClass = PALETTE[hashString(seed ?? name) % PALETTE.length];
  const sizeClass = SIZE_CLASSES[size];

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn(
          "rounded-full object-cover ring-1 ring-border shrink-0",
          sizeClass,
          className
        )}
        loading="lazy"
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={cn(
        "rounded-full flex items-center justify-center font-semibold ring-1 shrink-0",
        sizeClass,
        colorClass,
        className
      )}
    >
      {initials}
    </div>
  );
}
