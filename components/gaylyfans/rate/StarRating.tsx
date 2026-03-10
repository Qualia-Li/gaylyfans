"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange: (stars: number) => void;
  disabled?: boolean;
}

export default function StarRating({
  value,
  onChange,
  disabled = false,
}: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className={cn(
            "transition-colors",
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          )}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => !disabled && setHover(0)}
          onClick={() => !disabled && onChange(star)}
        >
          <Star
            className={cn(
              "w-6 h-6 transition-colors",
              (hover || value) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "fill-transparent text-zinc-600"
            )}
          />
        </button>
      ))}
    </div>
  );
}
