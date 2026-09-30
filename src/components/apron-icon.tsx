export function ApronIcon({
  size = 24,
  filled = false,
  className = '',
}: {
  size?: number;
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={`apron-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11 9V6a5 5 0 0 1 10 0v3M10 9h12v7l5 12H5l5-12V9Z"
        fill={filled ? 'currentColor' : 'none'}
        fillOpacity={filled ? 0.2 : 1}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 17h8v4h-8zM5 16l5-2M22 14l5 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
