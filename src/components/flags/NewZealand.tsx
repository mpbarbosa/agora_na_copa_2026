import React from "react";

interface FlagProps {
  className?: string;
}

export const NewZealandFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 800 400"
    className={`${className} shadow-md rounded`}
  >
    <rect width="800" height="400" fill="#00247d" />
    <g transform="scale(0.5)">
      <rect width="800" height="400" fill="#00247d" />
      <path d="M0 0 L800 400 M800 0 L0 400" stroke="#ffffff" strokeWidth="80" />
      <path d="M0 0 L800 400 M800 0 L0 400" stroke="#c8102e" strokeWidth="40" />
      <rect x="320" width="160" height="400" fill="#ffffff" />
      <rect y="120" width="800" height="160" fill="#ffffff" />
      <rect x="360" width="80" height="400" fill="#c8102e" />
      <rect y="160" width="800" height="80" fill="#c8102e" />
    </g>
    {[
      [580, 70, 24],
      [660, 170, 30],
      [560, 280, 34],
      [690, 330, 20],
    ].map(([cx, cy, r], i) => (
      <g key={i}>
        <circle cx={cx} cy={cy} r={r} fill="#ffffff" />
        <circle cx={cx} cy={cy} r={r * 0.72} fill="#c8102e" />
      </g>
    ))}
  </svg>
);
