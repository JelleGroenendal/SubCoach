interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className }: LogoProps): React.ReactNode {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect width="100" height="100" rx="20" fill="url(#logoGradient)" />

      {/* SC text - clean, bold, modern */}
      <text
        x="50"
        y="67"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="44"
        fontWeight="800"
        fill="white"
        textAnchor="middle"
        style={{ letterSpacing: "-2px" }}
      >
        SC
      </text>

      {/* Subtle substitution arrows accent */}
      <g
        opacity="0.85"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 80 L30 80 L27 77 M27 83 L30 80" />
        <path d="M80 80 L70 80 L73 77 M73 83 L70 80" />
      </g>
    </svg>
  );
}
