import React from "react";

interface FlagProps {
  className?: string;
}

export const CapeVerdeFlag: React.FC<FlagProps> = ({
  className = "w-16 h-12",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 720 480"
    className={`${className} rounded shadow-md`}
  >
    <rect width="720" height="480" fill="#0057b8" />
    <rect y="220" width="720" height="24" fill="#ffffff" />
    <rect y="252" width="720" height="24" fill="#ffffff" />
    <rect y="244" width="720" height="8" fill="#cf2027" />
    {[
      [172, 292],
      [214, 324],
      [266, 340],
      [320, 340],
      [372, 324],
      [414, 292],
      [434, 244],
      [426, 192],
      [392, 152],
      [342, 132],
    ].map(([cx, cy], index) => (
      <circle key={`${cx}-${cy}-${index}`} cx={cx} cy={cy} r="13" fill="#ffd84d" />
    ))}
  </svg>
);
