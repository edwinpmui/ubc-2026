const palette = ["#c2652a", "#1f8a5b", "#4f5bd5", "#b2408f", "#d19a1f", "#2c7da0", "#7a4fd6", "#c2413b"];

function colorFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function Avatar({ name, seed, size = 40 }: { name: string; seed?: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: colorFor(seed ?? name), fontSize: size * 0.38 }}
    >
      {initials(name) || "?"}
    </div>
  );
}

export function PennyMark({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e08a4f] to-copper-dark font-bold text-white shadow-inner"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      ¢
    </div>
  );
}
