import { motion } from "framer-motion";
import { ReactNode } from "react";

type FABProps = {
  icon: ReactNode;
  onClick?: () => void;
  label?: string;
};

export function FAB({ icon, onClick, label }: FABProps) {
  return (
    <motion.button
      type="button"
      className={`fixed bottom-6 right-6 ${
        label ? "pl-5 pr-6 py-3" : "p-4"
      } bg-primary text-primary-foreground rounded-full shadow-lg flex items-center gap-2 z-50 text-sm font-medium min-h-12`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="w-6 h-6 shrink-0 flex items-center justify-center [&_svg]:size-6">
        {icon}
      </span>
      {label && <span className="pr-0.5">{label}</span>}
    </motion.button>
  );
}
