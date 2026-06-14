import React from "react";

interface FlagProps {
  className?: string;
}

// Simplified 5-point star centered at the origin, reused along the diagonal band
const STAR_POINTS =
  "0,-18 4.23,-5.82 17.12,-5.56 6.85,2.22 10.58,14.56 0,7.2 -10.58,14.56 -6.85,2.22 -17.12,-5.56 -4.23,-5.82";

const STAR_CENTERS: [number, number][] = [
  [520, 28.57],
  [440, 85.71],
  [360, 142.86],
  [280, 200],
  [200, 257.14],
  [120, 314.29],
  [40, 371.43],
];

export const BosniaHerzegovinaFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 800 400"
    className={`${className} shadow-md rounded`}
  >
    <rect width="800" height="400" fill="#002395" />
    <path d="M0 0 L560 0 L0 400 Z" fill="#fecb00" />
    {STAR_CENTERS.map(([cx, cy], i) => (
      <polygon key={i} points={STAR_POINTS} fill="#ffffff" transform={`translate(${cx}, ${cy})`} />
    ))}
  </svg>
);
