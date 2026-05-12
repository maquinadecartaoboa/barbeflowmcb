import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceImageProps {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  rounded?: "full" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ServiceImageProps["size"]>, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const ICON_SIZE: Record<NonNullable<ServiceImageProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function ServiceImage({
  name,
  photoUrl,
  size = "md",
  rounded = "lg",
  className,
}: ServiceImageProps) {
  const roundedClass = rounded === "full" ? "rounded-full" : "rounded-lg";
  const sizeClass = SIZE_CLASSES[size];

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn(
          "object-cover ring-1 ring-border shrink-0",
          sizeClass,
          roundedClass,
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
        "flex items-center justify-center bg-muted text-muted-foreground ring-1 ring-border shrink-0",
        sizeClass,
        roundedClass,
        className
      )}
    >
      <Scissors className={ICON_SIZE[size]} />
    </div>
  );
}
