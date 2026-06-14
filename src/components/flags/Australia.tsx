import React from "react";

interface FlagProps {
  className?: string;
}

export const AustraliaFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 800 400"
    className={`${className} shadow-md rounded`}
  >
    <rect width="800" height="400" fill="#012169" />
    <g transform="scale(0.5)">
      <rect width="800" height="400" fill="#012169" />
      <path d="M0 0 L800 400 M800 0 L0 400" stroke="#ffffff" strokeWidth="80" />
      <path d="M0 0 L800 400 M800 0 L0 400" stroke="#c8102e" strokeWidth="40" />
      <rect x="320" width="160" height="400" fill="#ffffff" />
      <rect y="120" width="800" height="160" fill="#ffffff" />
      <rect x="360" width="80" height="400" fill="#c8102e" />
      <rect y="160" width="800" height="80" fill="#c8102e" />
    </g>
    <g fill="#ffffff">
      <circle cx="600" cy="88" r="26" />
      <circle cx="652" cy="152" r="14" />
      <circle cx="560" cy="176" r="16" />
      <circle cx="628" cy="230" r="18" />
      <circle cx="528" cy="258" r="14" />
      <circle cx="620" cy="320" r="42" />
    </g>
  </svg>
);
