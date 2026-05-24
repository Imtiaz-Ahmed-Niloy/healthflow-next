import { ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-2xl bg-card border border-border/60 shadow-soft ${className}`}>{children}</div>
);

export const SectionTitle = ({ title, action }: { title: string; action?: ReactNode }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="font-display text-xl text-primary">{title}</h2>
    {action}
  </div>
);

export const Kpi = ({ icon: Icon, label, value, trend, tone = "primary" }: {
  icon: LucideIcon; label: string; value: string; trend?: string; tone?: "primary" | "accent" | "destructive" | "chip";
}) => {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/40 text-accent-foreground",
    destructive: "bg-destructive/10 text-destructive",
    chip: "bg-chip text-chip-foreground",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border/60 p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-xl grid place-items-center ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && <span className="text-[11px] font-bold text-primary-glow">{trend}</span>}
      </div>
      <p className="text-[11px] tracking-widest font-bold text-muted-foreground mt-4">{label.toUpperCase()}</p>
      <p className="font-display text-2xl text-primary mt-1">{value}</p>
    </motion.div>
  );
};

export const Pill = ({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "ok" | "warn" | "bad" | "info" }) => {
  const tones: Record<string, string> = {
    default: "bg-muted text-foreground/70",
    ok: "bg-accent/50 text-accent-foreground",
    warn: "bg-yellow-100 text-yellow-800",
    bad: "bg-destructive/15 text-destructive",
    info: "bg-chip text-chip-foreground",
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
};

export const Btn = ({ children, onClick, variant = "primary", className = "", type = "button" }: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "outline" | "danger"; className?: string; type?: "button" | "submit";
}) => {
  const v: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    ghost: "text-primary hover:bg-muted/60",
    outline: "border border-border bg-card hover:bg-muted/60 text-primary",
    danger: "bg-destructive text-destructive-foreground hover:opacity-90",
  };
  return (
    <button type={type} onClick={onClick} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${v[variant]} ${className}`}>
      {children}
    </button>
  );
};
