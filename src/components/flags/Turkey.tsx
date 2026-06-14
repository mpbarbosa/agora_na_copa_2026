import React from "react";

interface FlagProps {
  className?: string;
}

export const TurkeyFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 800 400"
    className={`${className} shadow-md rounded`}
  >
    <rect width="800" height="400" fill="#e30a17" />
    <circle cx="300" cy="200" r="90" fill="#ffffff" />
    <circle cx="330" cy="200" r="72" fill="#e30a17" />
    <polygon
      points="440,200 472,212 462,182 482,160 450,160 440,130 430,160 398,160 418,182 408,212"
      fill="#ffffff"
      transform="rotate(18 440 200)"
    />
  </svg>
);
