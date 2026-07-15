import {
  Hexagon,
  Flame,
  Dumbbell,
  Sparkles,
  Recycle,
  FlaskConical,
  Heart,
  Sparkle,
  Brain,
  MoreHorizontal,
  Atom,
  Dna,
  Waves,
  Zap,
  Sun,
  Activity,
  Shield,
  Layers,
  Moon,
  Cpu,
  Battery,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Hexagon,
  Flame,
  Dumbbell,
  Sparkles,
  Recycle,
  FlaskConical,
  Heart,
  Sparkle,
  Brain,
  MoreHorizontal,
  Atom,
  Dna,
  Waves,
  Zap,
  Sun,
  Activity,
  Shield,
  Layers,
  Moon,
  Cpu,
  Battery,
};

export function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Hexagon;
  return <Icon {...props} />;
}
