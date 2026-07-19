interface Props {
  data: { day: string; score: number }[];
  uid?: string;
}

export function WeeklyChart({ data, uid = 'chart' }: Props) {
  const maxScore = Math.max(...data.map(d => d.score), 1);
  const fillId = `${uid}-fill`;
  const lineId = `${uid}-line`;

  return (
    <div className="relative h-28">
      <svg className="w-full h-full" viewBox="0 0 700 112" preserveAspectRatio="none">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={lineId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
        </defs>
        <path
          d={data.map((d, i) => {
            const x = (i / (data.length - 1)) * 700;
            const y = 112 - (d.score / maxScore) * 100;
            return i === 0 ? `M${x},${y}` : `C${x - 50},${y} ${x - 25},${y} ${x},${y}`;
          }).join(' ') + ` L700,112 L0,112 Z`}
          fill={`url(#${fillId})`}
        />
        <path
          d={data.map((d, i) => {
            const x = (i / (data.length - 1)) * 700;
            const y = 112 - (d.score / maxScore) * 100;
            return i === 0 ? `M${x},${y}` : `C${x - 50},${y} ${x - 25},${y} ${x},${y}`;
          }).join(' ')}
          fill="none"
          stroke={`url(#${lineId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 4px rgba(124, 58, 237, 0.4))' }}
        />
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * 700;
          const y = 112 - (d.score / maxScore) * 100;
          return <circle key={i} cx={x} cy={y} r="3" fill="#7C3AED" style={{ filter: 'drop-shadow(0 0 3px rgba(124, 58, 237, 0.6))' }} />;
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 translate-y-5">
        {data.map(d => <span key={d.day} className="text-[9px] text-slate-400 font-bold">{d.day}</span>)}
      </div>
    </div>
  );
}
