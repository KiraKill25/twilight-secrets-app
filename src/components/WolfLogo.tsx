import logo from "@/assets/roles/logo-wolf.jpg";

export function WolfLogo({ size = 220 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-70 animate-moon-glow bg-gradient-primary"
        aria-hidden
      />
      {/* Rotating gradient ring */}
      <div
        className="absolute inset-0 rounded-full opacity-90 animate-gradient-shift"
        style={{
          background:
            "conic-gradient(from 0deg, oklch(0.55 0.3 320), oklch(0.55 0.3 22), oklch(0.55 0.3 320))",
          maskImage:
            "radial-gradient(circle, transparent 62%, black 63%, black 68%, transparent 69%)",
          WebkitMaskImage:
            "radial-gradient(circle, transparent 62%, black 63%, black 68%, transparent 69%)",
        }}
        aria-hidden
      />
      {/* Fog */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div
          className="absolute inset-0 animate-fog"
          style={{
            background:
              "radial-gradient(ellipse at 30% 70%, oklch(0.55 0.3 320 / 0.35), transparent 60%)",
          }}
          aria-hidden
        />
      </div>
      {/* Wolf art */}
      <img
        src={logo}
        alt="Loup-Garou"
        width={size}
        height={size}
        className="relative z-10 rounded-full animate-wolf-pulse select-none"
        style={{
          width: size * 0.86,
          height: size * 0.86,
          objectFit: "cover",
          boxShadow: "inset 0 0 40px #000",
        }}
        draggable={false}
      />
    </div>
  );
}
