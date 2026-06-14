import React from "react";

interface FlagProps {
  className?: string;
}

export const ScotlandFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 800 480"
    className={`${className} shadow-md rounded`}
  >
    <rect width="800" height="480" fill="#0065bd" />
    <path
      d="M0 40 L40 0 L800 440 L760 480 Z"
      fill="#ffffff"
    />
    <path
      d="M760 0 L800 40 L40 480 L0 440 Z"
      fill="#ffffff"
    />
  </svg>
);
