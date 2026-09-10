import { rankForRating, rankTextClass } from "@/lib/cf-data";
import { cn } from "@/lib/utils";

export function Handle({
  handle,
  rating,
  className,
}: {
  handle: string;
  rating: number;
  className?: string;
}) {
  const rank = rankForRating(rating);
  return (
    <span
      className={cn(
        "font-medium hover:underline",
        rankTextClass[rank],
        rating >= 2400 && "font-semibold",
        className,
      )}
      title={`${handle} — ${rating}`}
    >
      {handle}
    </span>
  );
}
