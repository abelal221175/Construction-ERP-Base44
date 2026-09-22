import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ChevronRight, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/components/shared/formatters';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const ELEMENT_LABELS = {
  material: { ar: 'مواد', en: 'Material' },
  subcontractor: { ar: 'مقاول باطن', en: 'Subcontractor' },
  labor: { ar: 'عمالة', en: 'Labor' },
  equipment: { ar: 'معدات', en: 'Equipment' },
  service: { ar: 'خدمات', en: 'Service' },
  indirect: { ar: 'تكاليف غير مباشرة', en: 'Indirect' },
};

const varianceTone = (v) => {
  if (v > 0) return 'text-emerald-600';
  if (v < 0) return 'text-red-600';
  return 'text-slate-500';
};

export default function CostAnalysisWidget({ projects, language }) {
  const [drill, setDrill] = useState(null); // { level, project, boq }

  const { data: budgets = [] } = useQuery({
    queryKey: ['ProjectBudget'],
    queryFn: () => base44.entities.ProjectBudget.list(),
    staleTime: 60_000,
  });
  const { data: budgetLines = [] } = useQuery({
    queryKey: ['BudgetLine'],
    queryFn: () => base44.entities.BudgetLine.list(),
    staleTime: 60_000,
  });

  const projectRows = useMemo(() => {
    return projects.map((p) => {
      const pBudgets = budgets.filter((b) => b.project_id === p.id);
      const planned = pBudgets.filter((b) => b.budget_type === 'original').reduce((s, b) => s + (b.total_budget_amount || 0), 0)
        || (p.original_contract_value || 0);
      const revised = pBudgets.filter((b) => b.budget_type === 'revised').reduce((s, b) => s + (b.total_budget_amount || 0), 0)
        || (p.current_contract_value || p.original_contract_value || 0);
      const budgetIds = pBudgets.map((b) => b.id);
      const actual = budgetLines.filter((l) => budgetIds.includes(l.budget_id)).reduce((s, l) => s + (l.actual_amount || 0), 0);
      const variance = revised - actual;
      const variancePct = revised > 0 ? (variance / revised) * 100 : 0;
      return { project: p, planned, revised, actual, variance, variancePct };
    }).filter((r) => r.planned || r.revised || r.actual);
  }, [projects, budgets, budgetLines]);

  const openProject = (project) => setDrill({ level: 'boq', project });
  const openBoq = (boq) => setDrill({ level: 'cbs', project: drill.project, boq });

  const chartData = projectRows.map((r) => ({
    name: r.project.project_code || (language === 'ar' ? r.project.project_name_ar : r.project.project_name_en) || '—',
    planned: Math.round(r.planned),
    revised: Math.round(r.revised),
    actual: Math.round(r.actual),
    _project: r.project,
  }));

  const handleBarClick = (payload) => {
    if (payload && payload._project) openProject(payload._project);
  };

  return (
    <div className="bg-quartz-card border border-quartz-border rounded-lg">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-quartz-border">
        <div className="flex items-center gap-1.5">
          <TrendingDown className="h-4 w-4 text-quartz-accent" />
          <span className="text-[13px] font-semibold text-slate-700">
            {language === 'ar' ? 'تحليل التكلفة: المخطط مقابل المراجع مقابل الفعلي' : 'Cost Analysis: Planned vs Revised vs Actual'}
          </span>
        </div>
        <span className="text-[11px] text-quartz-muted">{projectRows.length} {language === 'ar' ? 'مشروع' : 'projects'}</span>
      </div>

      {/* Interactive comparison chart */}
      {chartData.length > 0 && (
        <div className="px-4 py-3 border-b border-quartz-border">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="18%">
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#78909C' }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: '#78909C' }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #E5E9EC', padding: '6px 10px' }}
                  formatter={(v) => formatCurrency(v, 'EGP', 0)}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" iconSize={8} />
                <Bar dataKey="planned" name={language === 'ar' ? 'مخطط' : 'Planned'} fill="#B0BEC5" radius={[3, 3, 0, 0]} onClick={handleBarClick} cursor="pointer" />
                <Bar dataKey="revised" name={language === 'ar' ? 'مراجع' : 'Revised'} fill="#546E7A" radius={[3, 3, 0, 0]} onClick={handleBarClick} cursor="pointer" />
                <Bar dataKey="actual" name={language === 'ar' ? 'فعلي' : 'Actual'} fill="#263238" radius={[3, 3, 0, 0]} onClick={handleBarClick} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-quartz-muted mt-1 text-center">
            {language === 'ar' ? 'انقر على أي مجموعة أعمدة للتنقل إلى تفاصيل المشروع' : 'Click any bar group to drill into project details'}
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-slate-50 border-b border-quartz-border">
            <tr>
              <th className="text-right font-medium text-quartz-muted px-4 py-2">{language === 'ar' ? 'المشروع' : 'Project'}</th>
              <th className="text-right font-medium text-quartz-muted px-3 py-2">{language === 'ar' ? 'مخطط' : 'Planned'}</th>
              <th className="text-right font-medium text-quartz-muted px-3 py-2">{language === 'ar' ? 'مراجع' : 'Revised'}</th>
              <th className="text-right font-medium text-quartz-muted px-3 py-2">{language === 'ar' ? 'فعلي' : 'Actual'}</th>
              <th className="text-right font-medium text-quartz-muted px-3 py-2">{language === 'ar' ? 'الانحراف' : 'Variance'}</th>
              <th className="text-right font-medium text-quartz-muted px-3 py-2">%</th>
            </tr>
          </thead>
          <tbody>
            {projectRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-quartz-muted py-6">
                  {language === 'ar' ? 'لا توجد بيانات تكلفة' : 'No cost data available'}
                </td>
              </tr>
            ) : projectRows.map((r) => (
              <tr
                key={r.project.id}
                onClick={() => openProject(r.project)}
                className="border-b border-quartz-border/60 hover:bg-slate-50 cursor-pointer"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-quartz-muted">{r.project.project_code}</span>
                    <ChevronRight className="h-3 w-3 text-quartz-muted" />
                    <span className="text-slate-800 truncate max-w-40">
                      {language === 'ar' ? r.project.project_name_ar : r.project.project_name_en}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-slate-700">{formatCurrency(r.planned, 'EGP', 0)}</td>
                <td className="px-3 py-2.5 font-mono text-slate-700">{formatCurrency(r.revised, 'EGP', 0)}</td>
                <td className="px-3 py-2.5 font-mono text-slate-800 font-medium">{formatCurrency(r.actual, 'EGP', 0)}</td>
                <td className={cn('px-3 py-2.5 font-mono', varianceTone(r.variance))}>
                  {formatCurrency(r.variance, 'EGP', 0)}
                </td>
                <td className={cn('px-3 py-2.5 font-mono', varianceTone(r.variance))}>
                  {r.variancePct > 0 ? '+' : ''}{r.variancePct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CostDrillDown
        drill={drill}
        setDrill={setDrill}
        budgets={budgets}
        budgetLines={budgetLines}
        language={language}
        onOpenBoq={openBoq}
      />
    </div>
  );
}

function CostDrillDown({ drill, setDrill, budgets, budgetLines, language, onOpenBoq }) {
  const open = !!drill;
  const project = drill?.project;
  const boq = drill?.boq;

  const { data: boqItems = [] } = useQuery({
    queryKey: ['ProjectBOQ', project?.id],
    enabled: open && drill?.level === 'boq',
    queryFn: () => base44.entities.ProjectBOQ.filter({ project_id: project.id }),
    staleTime: 60_000,
  });

  const boqRows = useMemo(() => {
    if (!boqItems.length) return [];
    const pBudgetIds = budgets.filter((b) => b.project_id === project?.id).map((b) => b.id);
    return boqItems
      .filter((b) => b.level === 3)
      .map((b) => {
        const lines = budgetLines.filter((l) => l.boq_id === b.id && pBudgetIds.includes(l.budget_id));
        const planned = lines.reduce((s, l) => s + (l.budget_amount || 0), 0) || (b.total_amount || 0);
        const revised = planned; // revised at BOQ level mirrors planned unless a revised budget line exists
        const actual = lines.reduce((s, l) => s + (l.actual_amount || 0), 0);
        const variance = revised - actual;
        const variancePct = revised > 0 ? (variance / revised) * 100 : 0;
        return { boq: b, planned, revised, actual, variance, variancePct };
      });
  }, [boqItems, budgetLines, budgets, project]);

  const cbsRows = useMemo(() => {
    if (!boq) return [];
    const pBudgetIds = budgets.filter((b) => b.project_id === project?.id).map((b) => b.id);
    const lines = budgetLines.filter((l) => l.boq_id === boq.id && pBudgetIds.includes(l.budget_id));
    const byElement = {};
    lines.forEach((l) => {
      const k = l.cost_element_type || 'other';
      if (!byElement[k]) byElement[k] = { element: k, planned: 0, revised: 0, actual: 0 };
      byElement[k].planned += l.budget_amount || 0;
      byElement[k].actual += l.actual_amount || 0;
      byElement[k].revised += l.budget_amount || 0;
    });
    return Object.values(byElement).map((r) => {
      r.variance = r.revised - r.actual;
      r.variancePct = r.revised > 0 ? (r.variance / r.revised) * 100 : 0;
      return r;
    });
  }, [boq, budgetLines, budgets, project]);

  const close = () => setDrill(null);
  const title = project ? (language === 'ar' ? project.project_name_ar : project.project_name_en) : '';

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="w-[520px] sm:max-w-[560px] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-quartz-border">
          <SheetTitle className="flex items-center gap-2 text-[14px]">
            <button
              onClick={close}
              className="text-quartz-muted hover:text-slate-700 text-[11px] font-normal"
            >
              {language === 'ar' ? 'تحليل التكلفة' : 'Cost Analysis'}
            </button>
            <ChevronRight className="h-3 w-3 text-quartz-muted" />
            <span className="font-mono text-[11px] text-quartz-muted">{project?.project_code}</span>
            <span className="truncate">{title}</span>
            {boq && (
              <>
                <ChevronRight className="h-3 w-3 text-quartz-muted" />
                <span className="font-mono text-[11px] text-quartz-muted">{boq.system_code || boq.external_code}</span>
              </>
            )}
          </SheetTitle>
        </SheetHeader>

        {drill?.level === 'boq' && (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-slate-50 border-b border-quartz-border">
                <tr>
                  <th className="text-right font-medium text-quartz-muted px-4 py-2">{language === 'ar' ? 'بند BOQ' : 'BOQ Item'}</th>
                  <th className="text-right font-medium text-quartz-muted px-3 py-2">{language === 'ar' ? 'مخطط' : 'Planned'}</th>
                  <th className="text-right font-medium text-quartz-muted px-3 py-2">{language === 'ar' ? 'فعلي' : 'Actual'}</th>
                  <th className="text-right font-medium text-quartz-muted px-3 py-2">{language === 'ar' ? 'الانحراف' : 'Variance'}</th>
                </tr>
              </thead>
              <tbody>
                {boqRows.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-quartz-muted py-6">{language === 'ar' ? 'لا توجد بنود' : 'No items'}</td></tr>
                ) : boqRows.map((r) => (
                  <tr
                    key={r.boq.id}
                    onClick={() => onOpenBoq(r.boq)}
                    className="border-b border-quartz-border/60 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-quartz-muted">{r.boq.system_code || r.boq.external_code}</span>
                        <ChevronRight className="h-3 w-3 text-quartz-muted" />
                        <span className="text-slate-700 truncate max-w-44">{r.boq.brief_description || r.boq.item_description}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-700">{formatCurrency(r.planned, 'EGP', 0)}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-800 font-medium">{formatCurrency(r.actual, 'EGP', 0)}</td>
                    <td className={cn('px-3 py-2.5 font-mono', varianceTone(r.variance))}>
                      {formatCurrency(r.variance, 'EGP', 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {drill?.level === 'cbs' && (
          <div className="flex-1 overflow-auto">
            <div className="px-5 py-2.5 bg-slate-50 border-b border-quartz-border">
              <p className="text-[11px] text-quartz-muted">{language === 'ar' ? 'هيكل تفصيل التكلفة (CBS)' : 'Cost Breakdown Structure (CBS)'}</p>
              <p className="text-[12px] text-slate-700 font-medium truncate">{boq?.item_description}</p>
            </div>
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-slate-50 border-b border-quartz-border">
                <tr>
                  <th className="text-right font-medium text-quartz-muted px-4 py-2">{language === 'ar' ? 'عنصر التكلفة' : 'Cost Element'}</th>
                  <th className="text-right font-medium text-quartz-muted px-3 py-2">{language === 'ar' ? 'مخطط' : 'Planned'}</th>
                  <th className="text-right font-medium text-quartz-muted px-3 py-2">{language === 'ar' ? 'فعلي' : 'Actual'}</th>
                  <th className="text-right font-medium text-quartz-muted px-3 py-2">{language === 'ar' ? 'الانحراف' : 'Variance'}</th>
                  <th className="text-right font-medium text-quartz-muted px-3 py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {cbsRows.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-quartz-muted py-6">{language === 'ar' ? 'لا توجد تفاصيل' : 'No breakdown'}</td></tr>
                ) : cbsRows.map((r) => {
                  const lbl = ELEMENT_LABELS[r.element] || { ar: r.element, en: r.element };
                  return (
                    <tr key={r.element} className="border-b border-quartz-border/60 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-700">{language === 'ar' ? lbl.ar : lbl.en}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">{formatCurrency(r.planned, 'EGP', 0)}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-800 font-medium">{formatCurrency(r.actual, 'EGP', 0)}</td>
                      <td className={cn('px-3 py-2.5 font-mono', varianceTone(r.variance))}>
                        {formatCurrency(r.variance, 'EGP', 0)}
                      </td>
                      <td className={cn('px-3 py-2.5 font-mono', varianceTone(r.variance))}>
                        {r.variancePct > 0 ? '+' : ''}{r.variancePct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}