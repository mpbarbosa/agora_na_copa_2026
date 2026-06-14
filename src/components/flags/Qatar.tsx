import React from "react";

interface FlagProps {
  className?: string;
}

// Serrated hoist-side band (9 white triangular teeth) typical of the Qatari flag
const TEETH_POINTS = Array.from({ length: 19 }, (_, i) => {
  const y = (i * 600) / 18;
  const x = i % 2 === 0 ? 250 : 300;
  return `${x},${y}`;
}).join(" ");

export const QatarFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="600" fill="#8d1b3d" />
    <polygon points={`0,0 ${TEETH_POINTS} 0,600`} fill="#ffffff" />
  </svg>
);
