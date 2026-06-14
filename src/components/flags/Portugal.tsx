import React from "react";

interface FlagProps {
  className?: string;
}

export const PortugalFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 600 400"
    className={`${className} shadow-md rounded`}
  >
    <rect width="240" height="400" fill="#006600" />
    <rect x="240" width="360" height="400" fill="#ff0000" />
    {/* Armillary sphere simplification */}
    <circle cx="240" cy="200" r="50" fill="#ffd700" opacity="0.85" />
    <rect x="233" y="155" width="14" height="90" fill="#ff0000" opacity="0.6" />
    <rect x="195" y="193" width="90" height="14" fill="#ff0000" opacity="0.6" />
  </svg>
);
