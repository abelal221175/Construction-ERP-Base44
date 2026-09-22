import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/components/shared/formatters';

const formatMillions = (v) => {
  if (!v) return '0';
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
};

const STATUS_CONFIG = {
  draft: { color: '#94a3b8', ar: 'مسودة', en: 'Draft' },
  approved: { color: '#3b82f6', ar: 'معتمد', en: 'Approved' },
  ordered: { color: '#8b5cf6', ar: 'مطلوب', en: 'Ordered' },
  received: { color: '#22c55e', ar: 'مستلم', en: 'Received' },
  cancelled: { color: '#ef4444', ar: 'ملغي', en: 'Cancelled' },
  pending: { color: '#f59e0b', ar: 'معلق', en: 'Pending' },
  submitted: { color: '#06b6d4', ar: 'مقدم', en: 'Submitted' },
};

const CustomTooltip = ({ active, payload, label, language }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-slate-600">{language === 'ar' ? 'العدد:' : 'Count:'} {payload[0]?.payload?.count}</p>
      <p className="text-slate-600">{language === 'ar' ? 'القيمة:' : 'Value:'} {formatCurrency(payload[0]?.value, 'EGP', 0)}</p>
    </div>
  );
};

export default function ProcurementStatusChart({ prs, pos, language }) {
  // PO status breakdown
  const poByStatus = Object.entries(
    pos.reduce((acc, po) => {
      const s = po.status || 'draft';
      if (!acc[s]) acc[s] = { count: 0, amount: 0 };
      acc[s].count++;
      acc[s].amount += (po.total_amount || 0);
      return acc;
    }, {})
  ).map(([status, data]) => ({
    name: STATUS_CONFIG[status]?.[language] || status,
    count: data.count,
    value: data.amount,
    color: STATUS_CONFIG[status]?.color || '#94a3b8',
  }));

  // PR status breakdown
  const prByStatus = Object.entries(
    prs.reduce((acc, pr) => {
      const s = pr.status || 'pending';
      if (!acc[s]) acc[s] = { count: 0 };
      acc[s].count++;
      return acc;
    }, {})
  ).map(([status, data]) => ({
    name: STATUS_CONFIG[status]?.[language] || status,
    count: data.count,
    color: STATUS_CONFIG[status]?.color || '#94a3b8',
  }));

  const totalPOValue = pos.reduce((sum, po) => sum + (po.total_amount || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="h-4 w-4 text-orange-600" />
          {language === 'ar' ? 'حالة المشتريات' : 'Procurement Status'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex-1 text-center p-2 bg-orange-50 rounded-lg">
            <p className="text-lg font-bold text-orange-700">{formatNumber(prs.length, 0)}</p>
            <p className="text-xs text-orange-600">{language === 'ar' ? 'طلبات الشراء' : 'PRs'}</p>
          </div>
          <div className="flex-1 text-center p-2 bg-purple-50 rounded-lg">
            <p className="text-lg font-bold text-purple-700">{formatNumber(pos.length, 0)}</p>
            <p className="text-xs text-purple-600">{language === 'ar' ? 'أوامر الشراء' : 'POs'}</p>
          </div>
          <div className="flex-1 text-center p-2 bg-slate-50 rounded-lg">
            <p className="text-sm font-bold text-slate-700">{formatMillions(totalPOValue)}</p>
            <p className="text-xs text-slate-500">{language === 'ar' ? 'قيمة الأوامر' : 'PO Value'}</p>
          </div>
        </div>

        {/* PO by Status Bar Chart */}
        {poByStatus.length > 0 ? (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={poByStatus} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tickFormatter={formatMillions} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={55} />
              <Tooltip content={<CustomTooltip language={language} />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {poByStatus.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
            {language === 'ar' ? 'لا توجد بيانات' : 'No data'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}