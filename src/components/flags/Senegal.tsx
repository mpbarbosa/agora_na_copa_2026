import React from "react";

interface FlagProps {
  className?: string;
}

export const SenegalFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="300" height="600" fill="#00853f" />
    <rect x="300" width="300" height="600" fill="#fdef42" />
    <rect x="600" width="300" height="600" fill="#e31b1b" />
    {/* Centered five-pointed star */}
    <polygon
      points="450,210 484,316 596,316 506,381 540,487 450,422 360,487 394,381 304,316 416,316"
      fill="#00853f"
    />
  </svg>
);
