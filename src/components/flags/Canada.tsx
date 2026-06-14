import React from "react";

interface FlagProps {
  className?: string;
}

export const CanadaFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 800 400"
    className={`${className} shadow-md rounded`}
  >
    <rect width="800" height="400" fill="#ffffff" />
    <rect width="200" height="400" fill="#ff0000" />
    <rect x="600" width="200" height="400" fill="#ff0000" />
    {/* Eleven-point maple leaf with integrated stem */}
    <path
      d="M400,70 L414,98 L450,85 L433,120 L478,138 L452,152 L483,188 L446,192
         L462,228 L430,216 L438,253 L408,242 L410,310 L390,310 L392,242 L362,253
         L370,216 L338,228 L354,192 L317,188 L348,152 L322,138 L367,120 L350,85 L386,98 Z"
      fill="#ff0000"
    />
  </svg>
);
