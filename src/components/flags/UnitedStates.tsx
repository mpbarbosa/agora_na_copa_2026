import React from "react";

interface FlagProps {
  className?: string;
}

export const UnitedStatesFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 950 500"
    className={`${className} shadow-md rounded`}
  >
    <rect width="950" height="500" fill="#ffffff" />
    {Array.from({ length: 7 }).map((_, index) => (
      <rect key={index} y={index * 76} width="950" height="38" fill="#b22234" />
    ))}
    <rect width="380" height="266" fill="#3c3b6e" />
    <g fill="#ffffff">
      {Array.from({ length: 6 }).map((_, row) =>
        Array.from({ length: row % 2 === 0 ? 6 : 5 }).map((__, col) => (
          <circle
            key={`${row}-${col}`}
            cx={row % 2 === 0 ? 36 + col * 60 : 66 + col * 60}
            cy={32 + row * 40}
            r="8"
          />
        )),
      )}
    </g>
  </svg>
);
