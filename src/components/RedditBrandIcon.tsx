interface RedditBrandIconProps {
  size?: number;
}

// Reddit's Snoo mark on the brand-orange (#FF4500) rounded square, mirroring the
// InstagramBrandIcon shape/scale so the two social feeds read as a set.
export function RedditBrandIcon({ size = 12 }: RedditBrandIconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" fill="#FF4500" />
      {/* Snoo head + body */}
      <circle cx="12" cy="14.4" r="5" fill="white" />
      {/* Antenna */}
      <circle cx="16.9" cy="6.6" r="1.15" fill="white" />
      <path d="M12 9.4V13" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M12 9.4L16.4 7" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="10.1" cy="14" r="0.95" fill="#FF4500" />
      <circle cx="13.9" cy="14" r="0.95" fill="#FF4500" />
      {/* Smile */}
      <path
        d="M9.7 16.1C10.3 16.7 11.1 17 12 17C12.9 17 13.7 16.7 14.3 16.1"
        stroke="#FF4500"
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
