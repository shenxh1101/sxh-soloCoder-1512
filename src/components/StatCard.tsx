import React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive?: boolean };
  color?: 'sky' | 'amber' | 'emerald' | 'rose' | 'violet';
  subtitle?: string;
}

const colorMap = {
  sky: {
    bg: 'from-sky-500 to-blue-600',
    iconBg: 'bg-white/20',
    glow: 'shadow-sky-500/25'
  },
  amber: {
    bg: 'from-amber-500 to-orange-500',
    iconBg: 'bg-white/20',
    glow: 'shadow-amber-500/25'
  },
  emerald: {
    bg: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-white/20',
    glow: 'shadow-emerald-500/25'
  },
  rose: {
    bg: 'from-rose-500 to-pink-600',
    iconBg: 'bg-white/20',
    glow: 'shadow-rose-500/25'
  },
  violet: {
    bg: 'from-violet-500 to-purple-600',
    iconBg: 'bg-white/20',
    glow: 'shadow-violet-500/25'
  }
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'sky',
  subtitle
}) => {
  const colors = colorMap[color];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-6 text-white shadow-xl transition-transform duration-300 hover:-translate-y-1',
        'bg-gradient-to-br',
        colors.bg,
        colors.glow
      )}
    >
      <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-white/5 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium">{title}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{value}</span>
              {subtitle && (
                <span className="text-white/70 text-sm">{subtitle}</span>
              )}
            </div>
            {trend && (
              <div className={cn(
                'mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                trend.positive
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-500/30 text-rose-100'
              )}>
                {trend.value}
              </div>
            )}
          </div>
          <div className={cn(
            'p-3 rounded-xl',
            colors.iconBg
          )}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
};
