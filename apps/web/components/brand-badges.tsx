'use client';

// Simplified, brand-colored marks for third-party connections — not the exact
// vector trademarks (no network access to fetch the real assets), but visually
// distinct and consistent with each brand's identity. Drop real logo files into
// apps/web/public/logos/ to swap these for pixel-exact artwork later.

export function StravaBadge({ size = 36, muted = false }: { size?: number; muted?: boolean }) {
  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ height: size, width: size, background: muted ? undefined : '#FC4C02' }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2 L18 14 L14 14 L14 22 L10 14 L6 14 Z"
          fill={muted ? '#00000030' : '#ffffff'}
        />
      </svg>
    </div>
  );
}

export function CorosBadge({ size = 36, muted = false }: { size?: number; muted?: boolean }) {
  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ height: size, width: size, background: muted ? undefined : '#0B7A6B' }}
    >
      <span
        className="font-black leading-none"
        style={{ fontSize: size * 0.42, color: muted ? '#00000030' : '#ffffff' }}
      >
        C
      </span>
    </div>
  );
}

export function OpenAiBadge({ size = 36, muted = false }: { size?: number; muted?: boolean }) {
  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ height: size, width: size, background: muted ? undefined : '#0f0f0f' }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
        <g fill={muted ? '#00000030' : '#ffffff'}>
          <rect x="10.5" y="2" width="3" height="20" rx="1.5" />
          <rect x="10.5" y="2" width="3" height="20" rx="1.5" transform="rotate(60 12 12)" />
          <rect x="10.5" y="2" width="3" height="20" rx="1.5" transform="rotate(120 12 12)" />
        </g>
      </svg>
    </div>
  );
}
