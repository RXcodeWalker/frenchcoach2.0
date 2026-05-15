import { motion } from 'framer-motion';

interface Props {
  data: number[];
  isRecording: boolean;
  variant?: 'learn' | 'exam';
}

export function Waveform({ data, isRecording, variant = 'learn' }: Props) {
  if (variant === 'learn') {
    return (
      <div className="flex items-end justify-center gap-[2px] h-20 mb-5 px-2">
        {data.map((h, i) => {
          const hue = 180 + (i / data.length) * 100; // cyan (180) to purple (280)
          const sat = isRecording ? 85 : 0;
          const light = isRecording ? 50 + (h / 48) * 15 : 8;
          return (
            <motion.div
              key={i}
              className="flex-1 rounded-full origin-bottom"
              animate={{
                height: isRecording ? `${Math.max(h, 4)}px` : '3px',
                backgroundColor: isRecording ? `hsl(${hue}, ${sat}%, ${light}%)` : 'rgba(255,255,255,0.03)',
              }}
              transition={isRecording ? { duration: 0.06 } : { duration: 0.35, type: 'spring', stiffness: 100, damping: 20 }}
              style={{
                boxShadow: isRecording
                  ? `0 0 8px hsl(${hue}, 90%, 55%), 0 0 16px hsl(${hue}, 80%, 45%), inset 0 0 4px hsl(${hue}, 100%, 60%)`
                  : 'none',
              }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-end justify-center gap-[2px] h-12">
      {data.map((h, i) => {
        const hue = 260 + (i / data.length) * 40; // purple to indigo
        const light = 55 + (h / 48) * 20;
        return (
          <motion.div
            key={i}
            className="w-[2.5px] rounded-full"
            animate={{
              height: isRecording ? `${h}px` : '4px',
              backgroundColor: isRecording ? `hsl(${hue}, 80%, ${light}%)` : 'rgba(255,255,255,0.03)',
            }}
            transition={isRecording ? { duration: 0.08 } : { duration: 0.3 }}
            style={{ boxShadow: isRecording ? `0 0 3px hsl(${hue}, 80%, 60%)` : 'none' }}
          />
        );
      })}
    </div>
  );
}
