import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercentage } from '@/components/shared/formatters';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ProjectCostControlMatrix({ projects, budgets, language, isRTL }) {
  const rows = (projects || []).map(p => {
    const b = (budgets || []).filter(x => x.project_id === p.id && x.is_current_version !== false);
    const bb = b.length ? b[0] : null;
    const budget = bb?.total_budget_amount || p.contract_value || 0;
    const actual = bb?.total_actual_amount || 0;
    const remaining = Math.max(0, budget - actual);
    const eac = actual + remaining;
    const variance = budget - eac;
    const varPct = budget ? (variance / budget) * 100 : 0;
    const pct = budget ? Math.min(100, (actual / budget) * 100) : 0;
    return { p, budget, actual, eac, variance, varPct, pct };
  })
    .filter(r => r.budget > 0)
    .sort((a, b) => a.varPct - b.varPct);

  if (!rows.length) {
    return (
      <div className="text-center text-slate-400 text-sm py-12">
        {language === 'ar' ? 'لا توجد مشاريع بميزانية' : 'No budgeted projects'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-3">
      <table className="w-full text-[13px] border-collapse min-w-[640px]">
        <thead>
          <tr className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wide">
            <th className="text-start font-medium px-3 py-2 border-b border-erp-border">{language === 'ar' ? 'المشروع' : 'Project'}</th>
            <th className="text-end font-medium px-3 py-2 border-b border-erp-border font-mono">{language === 'ar' ? 'الميزانية' : 'Budget'}</th>
            <th className="text-end font-medium px-3 py-2 border-b border-erp-border font-mono">{language === 'ar' ? 'الفعلي' : 'Actual'}</th>
            <th className="text-end font-medium px-3 py-2 border-b border-erp-border font-mono">EAC</th>
            <th className="text-end font-medium px-3 py-2 border-b border-erp-border font-mono">{language === 'ar' ? 'التباين %' : 'Var %'}</th>
            <th className="text-start font-medium px-3 py-2 border-b border-erp-border w-44">{language === 'ar' ? 'الاستهلاك' : 'Consumption'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ p, budget, actual, eac, varPct, pct }) => {
            const over = varPct < 0;
            return (
              <tr key={p.id} className="hover:bg-slate-50 border-b border-erp-border last:border-0">
                <td className="px-3 py-2">
                  <Link to={createPageUrl('ProjectDetails') + `?id=${p.id}`} className="text-erp-accent hover:underline font-medium font-mono text-[12px]">
                    {p.project_code}
                  </Link>
                  <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{language === 'ar' ? p.project_name_ar : p.project_name_en}</p>
                </td>
                <td className="px-3 py-2 text-end font-mono text-slate-700">{formatCurrency(budget, 'EGP', 0)}</td>
                <td className="px-3 py-2 text-end font-mono text-slate-700">{formatCurrency(actual, 'EGP', 0)}</td>
                <td className="px-3 py-2 text-end font-mono text-slate-700">{formatCurrency(eac, 'EGP', 0)}</td>
                <td className={cn("px-3 py-2 text-end font-mono font-medium", over ? "text-erp-ruby" : "text-erp-emerald")}>{formatPercentage(varPct, 1)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", over ? "bg-erp-ruby" : "bg-erp-accent")} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 w-8 text-end">{pct.toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}