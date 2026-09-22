import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { formatCurrency } from '@/components/shared/formatters';
import { TrendingUp } from 'lucide-react';

const formatMillions = (v) => {
  if (!v) return '0';
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
};

const CustomTooltip = ({ active, payload, label, language }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-600">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value, 'EGP', 0)}</span>
        </div>
      ))}
    </div>
  );
};

export default function FinancialPerformanceChart({ ipcs, pos, language }) {
  // Build monthly data from IPCs and POs (last 6 months)
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short' }),
      revenue: 0,
      procurement: 0,
    });
  }

  ipcs.forEach(ipc => {
    if (!ipc.created_date) return;
    const key = ipc.created_date.slice(0, 7);
    const m = months.find(m => m.key === key);
    if (m) m.revenue += (ipc.current_amount || ipc.net_payable_amount || 0);
  });

  pos.forEach(po => {
    if (!po.created_date) return;
    const key = po.created_date.slice(0, 7);
    const m = months.find(m => m.key === key);
    if (m) m.procurement += (po.total_amount || 0);
  });

  const revLabel = language === 'ar' ? 'الإيرادات' : 'Revenue';
  const procLabel = language === 'ar' ? 'المشتريات' : 'Procurement';

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          {language === 'ar' ? 'الأداء المالي (آخر 6 أشهر)' : 'Financial Performance (Last 6 Months)'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={months} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatMillions} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip language={language} />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="revenue" name={revLabel} stroke="#3b82f6" fill="url(#colorRevenue)" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
            <Area type="monotone" dataKey="procurement" name={procLabel} stroke="#f97316" fill="url(#colorProc)" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}