interface LogoProps {
  size?: number;
  className?: string;
  /** When true, render only the mark; otherwise mark + wordmark */
  markOnly?: boolean;
  /** Accessible label */
  title?: string;
}

/**
 * Today brand mark — a sunrise: a warm half-disc clearing the horizon, with
 * two short rays. Gradient: amber → orange → indigo, anchored on the
 * existing `--m-today` accent. Renders as inline SVG so it tints with the
 * brand and scales cleanly from favicon size up to splash heroes.
 */
export function Logo({ size = 28, className, markOnly = false, title = 'Today' }: LogoProps) {
  const h = size;
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: Math.max(6, h * 0.28) }}
      aria-label={title}
      role="img"
    >
      <LogoMark size={h} />
      {!markOnly && (
        <span
          style={{
            fontSize: h * 0.68,
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: 1,
            background:
              'linear-gradient(135deg, #f59e0b 0%, #f97316 35%, #ec4899 65%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Today
        </span>
      )}
    </span>
  );
}

export function LogoMark({ size = 28 }: { size?: number }) {
  // Unique gradient ids so multiple marks on the page don't collide
  const gid = `today-sun-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        filter: `drop-shadow(0 ${Math.round(size * 0.12)}px ${Math.round(size * 0.32)}px rgba(249,115,22,0.32))`,
      }}
    >
      <defs>
        {/* Dawn gradient — amber at the top of the sun, deeper into indigo near the horizon */}
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="55%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id={`${gid}-horizon`} x1="0" y1="0" x2="48" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#6366f1" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={`${gid}-ray`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Sun: half disc rising from the horizon */}
      <path
        d="M 8 32 A 16 16 0 0 1 40 32 Z"
        fill={`url(#${gid})`}
      />

      {/* Two short rays angling up-left + up-right from above the sun */}
      <path
        d="M 13 14 L 16 20"
        stroke={`url(#${gid}-ray)`}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M 35 14 L 32 20"
        stroke={`url(#${gid}-ray)`}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Tiny "morning star" above the sun */}
      <circle cx="24" cy="10" r="1.6" fill="#fde68a" />

      {/* Horizon line beneath the sun */}
      <path
        d="M 4 36 L 44 36"
        stroke={`url(#${gid}-horizon)`}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* Short secondary horizon dash (foreground) */}
      <path
        d="M 14 41 L 34 41"
        stroke={`url(#${gid}-horizon)`}
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
