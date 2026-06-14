import React from "react";

interface FlagProps {
  className?: string;
}

export const MoroccoFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 800 400"
    className={`${className} shadow-md rounded`}
  >
    <rect width="800" height="400" fill="#c1272d" />
    {/* Simplified Seal of Solomon (green pentagram outline) */}
    <polygon
      points="400,110 442,233 572,233 466,308 506,431 400,355 294,431 334,308 228,233 358,233"
      fill="none"
      stroke="#006233"
      strokeWidth="16"
      strokeLinejoin="round"
      transform="translate(0,-15)"
    />
  </svg>
);
