export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="13" height="16" rx="2.5" fill="currentColor" fillOpacity="0.16" />
      <rect x="3" y="3" width="13" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M7 8h5M7 11.5h5M7 15h3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M15 9.5 19.5 12 15 14.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
