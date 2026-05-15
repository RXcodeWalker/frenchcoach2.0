import { motion } from 'framer-motion';

interface Props {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({ data, color = '#7C3AED', width = 60, height = 20 }: Props) {
  if (!data || data.length < 2) return null;

  // Normalize data points
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (val * height); // 0 is bottom, 1 is top
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}
