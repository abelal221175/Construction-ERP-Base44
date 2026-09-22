import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PERIOD_OPTIONS = [
  { id: 'month', labelAr: 'هذا الشهر', labelEn: 'This Month' },
  { id: 'quarter', labelAr: 'هذا الربع', labelEn: 'This Quarter' },
  { id: 'year', labelAr: 'هذا العام', labelEn: 'This Year' },
  { id: 'all', labelAr: 'الكل', labelEn: 'All Time' },
];

export const getPeriodRange = (period) => {
  const now = new Date();
  if (period === 'month') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) };
  }
  if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    return { start: new Date(now.getFullYear(), q * 3, 1), end: new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59) };
  }
  if (period === 'year') {
    return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59) };
  }
  return { start: null, end: null };
};

export const inPeriod = (dateStr, range) => {
  if (!range.start) return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d >= range.start && d <= range.end;
};

export default function DateRangeFilter({ period, onChange, language }) {
  return (
    <div className="flex items-center gap-1 bg-white rounded-md p-0.5 border border-quartz-border shadow-sm">
      <Calendar className="h-3.5 w-3.5 text-quartz-muted mx-1.5 shrink-0" />
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            'px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap',
            period === opt.id
              ? 'bg-quartz-nav text-white'
              : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          {language === 'ar' ? opt.labelAr : opt.labelEn}
        </button>
      ))}
    </div>
  );
}