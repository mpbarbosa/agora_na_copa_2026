import React from "react";

interface FlagProps {
  className?: string;
}

// Simplified checkerboard shield (5 columns x 4 rows) centered on the white band
const CHECKER_COLS = 5;
const CHECKER_ROWS = 4;
const CELL = 24;
const SHIELD_X = 450 - (CHECKER_COLS * CELL) / 2;
const SHIELD_Y = 300 - (CHECKER_ROWS * CELL) / 2;

export const CroatiaFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    className={`${className} shadow-md rounded`}
  >
    <rect width="900" height="600" fill="#ff0000" />
    <rect y="200" width="900" height="200" fill="#ffffff" />
    <rect y="400" width="900" height="200" fill="#171796" />
    {Array.from({ length: CHECKER_ROWS }).map((_, row) =>
      Array.from({ length: CHECKER_COLS }).map((_, col) => (
        <rect
          key={`${row}-${col}`}
          x={SHIELD_X + col * CELL}
          y={SHIELD_Y + row * CELL}
          width={CELL}
          height={CELL}
          fill={(row + col) % 2 === 0 ? "#ff0000" : "#ffffff"}
          stroke="#171796"
          strokeWidth="1"
        />
      ))
    )}
  </svg>
);
