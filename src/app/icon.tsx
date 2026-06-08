import { ImageResponse } from "next/og";

export function generateImageMetadata() {
  return [
    { id: "192", size: { width: 192, height: 192 }, contentType: "image/png" },
    { id: "512", size: { width: 512, height: 512 }, contentType: "image/png" },
  ];
}

const SIZES: Record<string, number> = { "192": 192, "512": 512 };

export default function Icon({ id }: { id: string }) {
  const s = SIZES[id] ?? 512;

  // Scale relative to 512 canvas
  const scale = s / 512;
  const pad = Math.round(80 * scale);
  const inner = s - pad * 2;
  const radius = Math.round(120 * scale);

  // Stroke width scaled with canvas size
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
            width={inner * 0.58}
            height={inner * 0.58}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0f172a"
            strokeWidth="2.8"
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
