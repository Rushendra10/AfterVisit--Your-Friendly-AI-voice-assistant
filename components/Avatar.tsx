"use client";

import type { Persona } from "@/lib/types";

export function Avatar({
  p,
  size = 36,
  active = false,
}: {
  p: Persona;
  size?: number;
  active?: boolean;
}) {
  return (
    <div
      className="relative flex items-center justify-center rounded-full font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        background: `${p.color}22`,
        color: p.color,
        border: `1.5px solid ${p.color}`,
        boxShadow: active ? `0 0 0 3px ${p.color}33, 0 0 18px ${p.color}66` : "none",
        fontSize: size * 0.42,
        transition: "box-shadow .2s ease",
      }}
      aria-label={p.name}
    >
      {p.initial}
    </div>
  );
}
