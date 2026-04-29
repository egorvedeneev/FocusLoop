import { motion } from "framer-motion";

type Option = {
  value: string;
  label: string;
};

type SegmentedControlProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
};

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="inline-flex bg-secondary rounded-full p-1">
      {options.map((option) => (
        <button
          key={option.value}
          className={`relative px-6 py-2 rounded-full transition-colors ${
            value === option.value ? "text-primary" : "text-muted-foreground"
          }`}
          onClick={() => onChange(option.value)}
        >
          {value === option.value && (
            <motion.div
              className="absolute inset-0 bg-card rounded-full shadow-sm"
              layoutId="activeSegment"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
