import React from "react";

interface FlagProps {
  className?: string;
}

const STAR_POINTS =
  "0,-14 3.29,-4.53 13.31,-4.33 5.33,1.73 8.23,11.33 0,5.6 -8.23,11.33 -5.33,1.73 -13.31,-4.33 -3.29,-4.53";

const STAR_X = [225, 305, 385, 465, 545, 625, 705];

export const VenezuelaFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="200" fill="#ffcc00" />
    <rect y="200" width="900" height="200" fill="#00247d" />
    <rect y="400" width="900" height="200" fill="#cf142b" />
    {STAR_X.map((x, i) => (
      <polygon key={i} points={STAR_POINTS} fill="#ffffff" transform={`translate(${x}, 300)`} />
    ))}
  </svg>
);
