import { ImageResponse } from "next/og";

export function generateImageMetadata() {
  return [
    { id: "192", size: { width: 192, height: 192 }, contentType: "image/png" },
    { id: "512", size: { width: 512, height: 512 }, contentType: "image/png" },
  ];
}

export default function Icon({
  id,
  size,
}: {
  id: string;
  size: { width: number; height: number };
}) {
  const { width, height } = size;
  const s = width; // square

  // Scale relative to 512 canvas
  const scale = s / 512;
  const pad = Math.round(80 * scale);
  const inner = s - pad * 2;
  const radius = Math.round(120 * scale);

  // Shield path scaled to `inner` box, centred at (pad, pad)
  // Lucide ShieldCheck viewBox 0 0 24 24, scaled to inner×inner
  const unit = inner / 24;
  const tx = pad;
  const ty = pad;

  // Stroke width
  const sw = Math.max(1, Math.round(2 * scale));

  return new ImageResponse(
    (
      <div
        style={{
          width: s,
          height: s,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08111f",
        }}
      >
        {/* Gradient pill background */}
        <div
          style={{
            width: inner,
            height: inner,
            borderRadius: radius,
            background: "linear-gradient(135deg, #38bdf8, #22d3ee)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* ShieldCheck SVG */}
          <svg
            width={inner * 0.55}
            height={inner * 0.55}
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth={sw * (24 / inner) * 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
      </div>
    ),
    { width: s, height: s },
  );
}
