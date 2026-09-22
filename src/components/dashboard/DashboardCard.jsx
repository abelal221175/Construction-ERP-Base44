import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, ArrowUpRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

const DONUT_COLORS = ['#263238', '#546E7A', '#78909C', '#90A4AE', '#B0BEC5', '#CFD8DC'];

export default function DashboardCard({ widget, chartData, language, onDrillDown }) {
  const link = createPageUrl(widget.link) + (widget.params || '');
  const title = language === 'ar' ? widget.titleAr : widget.titleEn;
  const Icon = widget.icon;

  // ── Chart card → drill-down ──
  if (widget.type === 'chart') {
    const handleKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onDrillDown?.(widget);
      }
    };
    const chartType = widget.chartType || 'bar';

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onDrillDown?.(widget)}
        onKeyDown={handleKey}
        className="bg-quartz-card border border-quartz-border rounded-lg p-3 h-36 flex flex-col group hover:border-quartz-accent transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-medium text-slate-600 truncate">{title}</span>
          <ArrowUpRight className="h-3 w-3 text-slate-300 group-hover:text-quartz-accent shrink-0" />
        </div>
        <div className="flex-1 -mx-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'donut' ? (
              <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                <Pie
                  data={chartData || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={28}
                  outerRadius={48}
                  paddingAngle={1}
                  isAnimationActive={false}
                  onClick={(d) => onDrillDown?.(widget, d.name)}
                >
                  {(chartData || []).map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} cursor="pointer" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 10, borderRadius: 4, border: '1px solid #E5E9EC', padding: '2px 6px' }}
                />
              </PieChart>
            ) : chartType === 'line' ? (
              <LineChart data={chartData || []} margin={{ left: 2, right: 6, top: 4, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#78909C' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 10, borderRadius: 4, border: '1px solid #E5E9EC', padding: '2px 6px' }}
                />
                <Line type="monotone" dataKey="value" stroke="#546E7A" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            ) : (
              <BarChart data={chartData || []} layout="vertical" margin={{ left: 2, right: 6, top: 2, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={68}
                  tick={{ fontSize: 9, fill: '#78909C' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ fontSize: 10, borderRadius: 4, border: '1px solid #E5E9EC', padding: '2px 6px' }}
                />
                <Bar dataKey="value" radius={[0, 2, 2, 0]} fill="#546E7A" barSize={9} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // ── Action / quick-link card → navigate ──
  return (
    <Link
      to={link}
      className="bg-quartz-card border border-quartz-border rounded-lg p-3 h-36 flex flex-col justify-between group hover:border-quartz-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-[11px] font-medium text-slate-600 leading-tight">{title}</span>
        <ArrowUpRight className="h-3 w-3 text-slate-300 group-hover:text-quartz-accent shrink-0" />
      </div>
      <div className="flex items-end justify-end">
        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-quartz-accent group-hover:bg-quartz-accent group-hover:text-white transition-colors">
          {widget.type === 'action' ? <Plus className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </div>
      </div>
    </Link>
  );
}