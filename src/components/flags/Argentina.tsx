import React from "react";

interface FlagProps {
  className?: string;
}

// Sol de Mayo rays, defined as [tipX, tipY, baseLeftX, baseLeftY, baseRightX, baseRightY]
const LONG_RAYS: [number, number, number, number, number, number][] = [
  [265, 150, 243.93, 148.34, 243.93, 151.66],
  [253.28, 178.28, 239.55, 162.21, 237.22, 164.55],
  [225, 190, 226.66, 168.93, 223.34, 168.93],
  [196.72, 178.28, 212.78, 164.55, 210.45, 162.21],
  [185, 150, 206.07, 151.66, 206.07, 148.34],
  [196.72, 121.72, 210.45, 137.79, 212.78, 135.45],
  [225, 110, 223.34, 131.07, 226.66, 131.07],
  [253.28, 121.72, 237.22, 135.45, 239.55, 137.79],
];

const SHORT_RAYS: [number, number, number, number, number, number][] = [
  [252.72, 161.48, 243.02, 156.03, 241.0, 158.48],
  [236.48, 177.72, 233.48, 167.0, 231.03, 168.02],
  [213.52, 177.72, 218.97, 168.02, 216.52, 167.0],
  [197.28, 161.48, 208.0, 158.48, 206.98, 156.03],
  [197.28, 138.52, 206.98, 143.97, 208.0, 141.52],
  [213.52, 122.28, 216.52, 133.0, 218.97, 131.98],
  [236.48, 122.28, 231.03, 131.98, 233.48, 133.0],
  [252.72, 138.52, 241.0, 141.52, 243.02, 143.97],
];

export const ArgentinaFlag: React.FC<FlagProps> = ({ className = "w-16 h-12" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 450 300"
    className={`${className} shadow-md rounded`}
  >
    <rect width="450" height="100" fill="#74acdf" />
    <rect y="100" width="450" height="100" fill="#ffffff" />
    <rect y="200" width="450" height="100" fill="#74acdf" />

    {/* Sol de Mayo - 16 alternating rays */}
    {LONG_RAYS.map(([tx, ty, b1x, b1y, b2x, b2y], i) => (
      <polygon
        key={`long-${i}`}
        points={`${tx},${ty} ${b1x},${b1y} ${b2x},${b2y}`}
        fill="#fcbf49"
        stroke="#85340a"
        strokeWidth="0.75"
      />
    ))}
    {SHORT_RAYS.map(([tx, ty, b1x, b1y, b2x, b2y], i) => (
      <polygon
        key={`short-${i}`}
        points={`${tx},${ty} ${b1x},${b1y} ${b2x},${b2y}`}
        fill="#f6aa1c"
        stroke="#85340a"
        strokeWidth="0.75"
      />
    ))}

    {/* Sun face */}
    <circle cx="225" cy="150" r="18" fill="#fcbf49" stroke="#85340a" strokeWidth="1.5" />
    <g stroke="#85340a" fill="none" strokeWidth="1.4" strokeLinecap="round">
      <path d="M214,141 Q217,138.5 220,140.5" />
      <path d="M230,140.5 Q233,138.5 236,141" />
      <path d="M217,162 Q225,166 233,162" />
    </g>
    <ellipse cx="217.5" cy="147" rx="2" ry="2.8" fill="#85340a" />
    <ellipse cx="232.5" cy="147" rx="2" ry="2.8" fill="#85340a" />
    <path d="M223,150 L227,150 L225,158 Z" fill="#e0922f" />
  </svg>
);
