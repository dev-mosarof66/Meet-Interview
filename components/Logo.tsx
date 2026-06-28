import { useId } from "react";

type LogoProps = {
  /** square size of the mark in px */
  size?: number;
  /** show the "Meet Interview / Get answered" wordmark next to the mark */
  withWordmark?: boolean;
  /** "bubble" = standalone chat-bubble mark · "tile" = rounded app-icon square */
  variant?: "bubble" | "tile";
  className?: string;
};

/**
 * Meet Interview brand logo.
 *
 * Mark: a chat bubble (you got a reply) holding a callback/reply arrow,
 * with a coral "new" dot — the "get answered" moment, in one symbol.
 * Indigo gradient (#6366F1 → #4338CA) with the brand coral accent (#FB7185).
 */
export function Logo({
  size = 32,
  withWordmark = false,
  variant = "bubble",
  className,
}: LogoProps) {
  const id = useId();
  const grad = `cb-grad-${id}`;

  const mark =
    variant === "tile" ? (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Meet Interview"
      >
        <defs>
          <linearGradient id={grad} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="0.55" stopColor="#4F46E5" />
            <stop offset="1" stopColor="#4338CA" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill={`url(#${grad})`} />
        {/* reply / callback arrow */}
        <path
          d="M22 16 16 22l6 6"
          stroke="#fff"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 22h13c3.3 0 5 1.9 5 5v2"
          stroke="#fff"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* coral "new reply" dot */}
        <circle cx="35" cy="14" r="3.4" fill="#FB7185" />
      </svg>
    ) : (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Meet Interview"
      >
        <defs>
          <linearGradient id={grad} x1="4" y1="5" x2="44" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="0.55" stopColor="#4F46E5" />
            <stop offset="1" stopColor="#4338CA" />
          </linearGradient>
        </defs>
        {/* chat bubble body + tail */}
        <path
          d="M14 5h20a10 10 0 0 1 10 10v9a10 10 0 0 1-10 10H22l-9 8 1.5-8H14A10 10 0 0 1 4 24v-9A10 10 0 0 1 14 5Z"
          fill={`url(#${grad})`}
        />
        {/* reply / callback arrow */}
        <path
          d="M23 14.5 17 20.5l6 6"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17 20.5h12c3.3 0 5 1.9 5 5"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* coral "new reply" dot */}
        <circle cx="36.5" cy="10.5" r="3.2" fill="#FB7185" />
      </svg>
    );

  if (!withWordmark) return <span className={className}>{mark}</span>;

  return (
    <span className={`flex items-center gap-2 ${className ?? ""}`}>
      {mark}
      <span className="leading-tight">
        <span className="block whitespace-nowrap text-base font-bold tracking-tight text-brand-900 dark:text-white">
          Meet Interview
        </span>
        <span className="-mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-coral-500">
          Get answered
        </span>
      </span>
    </span>
  );
}
