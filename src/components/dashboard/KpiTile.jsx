import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/components/shared/formatters';
import { cn } from '@/lib/utils';
import Sparkline from './Sparkline';

export default function KpiTile({ widget, value, seriesData, language, onDrillDown }) {
  const title = language === 'ar' ? widget.titleAr : widget.titleEn;
  const num = typeof value === 'number' ? value : 0;
  const display = widget.isCurrency ? formatCurrency(num, 'EGP', 0) : formatNumber(num, 0);

  const handleClick = () => onDrillDown?.(widget);
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKey}
      className="bg-quartz-card border border-quartz-border rounded-lg p-3 flex flex-col gap-1.5 hover:border-quartz-accent transition-colors group cursor-pointer h-full"
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] text-quartz-muted truncate">{title}</span>
        <ArrowUpRight className="h-3 w-3 text-slate-300 group-hover:text-quartz-accent shrink-0" />
      </div>
      <div className="flex items-end justify-between gap-1">
        <span className="font-mono text-xl font-bold text-slate-900 tracking-tight leading-none">
          {display}
        </span>
        {seriesData && seriesData.length >= 2 && <Sparkline data={seriesData} />}
      </div>
      <span className="text-[10px] text-quartz-muted">
        {language === 'ar' ? 'منذ ٥ د' : '5 min ago'}
      </span>
    </div>
  );
}