interface Props {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function SettingToggle({ icon, label, description, enabled, onToggle, disabled }: Props) {
  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${disabled ? 'opacity-35' : 'hover:bg-white/[0.02] cursor-pointer'}`}
      onClick={disabled ? undefined : onToggle}
    >
      <div className="text-slate-600">{icon}</div>
      <div className="flex-1">
        <p className="text-[10px] font-semibold text-white">{label}</p>
        <p className="text-[9px] text-slate-700">{description}</p>
      </div>
      <div className={`relative w-8 h-[18px] rounded-full transition-all duration-200 ${enabled ? 'bg-primary' : 'bg-navy-400'}`}>
        <div className={`absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'left-[15px]' : 'left-[2px]'}`} />
      </div>
    </div>
  );
}
