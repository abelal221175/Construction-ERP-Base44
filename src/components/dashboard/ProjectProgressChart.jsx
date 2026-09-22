import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadialBarChart, RadialBar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Briefcase, ExternalLink } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/components/shared/formatters';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  active: '#22c55e',
  completed: '#3b82f6',
  on_hold: '#f59e0b',
  cancelled: '#ef4444',
  planning: '#8b5cf6',
};

const STATUS_LABELS = {
  active: { ar: 'نشط', en: 'Active' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  on_hold: { ar: 'معلق', en: 'On Hold' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
  planning: { ar: 'تخطيط', en: 'Planning' },
};

export default function ProjectProgressChart({ projects, language, isRTL, onProjectClick }) {
  const statusCounts = projects.reduce((acc, p) => {
    const s = p.status || 'planning';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status]?.[language] || status,
    value: count,
    status,
    color: STATUS_COLORS[status] || '#94a3b8',
  }));

  const totalContractValue = projects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
  const activeProjects = projects.filter(p => p.status === 'active');

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: d.color }} />
          <span className="font-medium">{d.name}: {d.value}</span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="h-4 w-4 text-blue-600" />
          {language === 'ar' ? 'حالة المشروعات' : 'Project Status'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            <p className="text-2xl font-bold text-slate-900">{formatNumber(projects.length, 0)}</p>
            <p className="text-xs text-slate-500">{language === 'ar' ? 'إجمالي المشروعات' : 'Total Projects'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-blue-700">{formatCurrency(totalContractValue, 'EGP', 0)}</p>
            <p className="text-xs text-slate-500">{language === 'ar' ? 'إجمالي العقود' : 'Total Contract Value'}</p>
          </div>
        </div>

        {projects.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
            {language === 'ar' ? 'لا توجد مشروعات' : 'No projects'}
          </div>
        )}

        {/* Active Project List */}
        {activeProjects.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
              {language === 'ar' ? 'المشروعات النشطة' : 'Active Projects'}
            </p>
            {activeProjects.slice(0, 3).map(p => (
              <button
                key={p.id}
                onClick={() => onProjectClick(p)}
                className={cn(
                  "w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-50 transition-colors text-left",
                  isRTL && "flex-row-reverse text-right"
                )}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">
                    {language === 'ar' ? p.project_name_ar : p.project_name_en}
                  </p>
                  <p className="text-xs text-slate-400">{p.project_code}</p>
                </div>
                <ExternalLink className="h-3 w-3 text-slate-400 flex-shrink-0" />
              </button>
            ))}
            {activeProjects.length > 3 && (
              <Link to={createPageUrl('Projects')} className="text-xs text-blue-600 hover:underline block text-center mt-1">
                +{activeProjects.length - 3} {language === 'ar' ? 'مشروع آخر' : 'more'}
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}