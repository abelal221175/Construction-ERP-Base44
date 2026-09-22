import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, BarChart3, Target, CheckCircle2, Zap } from 'lucide-react';
import { formatNumber } from '@/components/shared/formatters';
import { cn } from '@/lib/utils';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function SiteProduction() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const [projectId, setProjectId] = useState('');

  const cf = currentCompany ? { company_id: currentCompany.id } : {};
  const { data: projects = [] } = useQuery({
    queryKey: ['siteProjects', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.Project.filter(cf) : base44.entities.Project.list(),
    staleTime: 60_000,
  });
  const { data: boqItems = [] } = useQuery({
    queryKey: ['siteProductionBOQ', projectId],
    queryFn: () => projectId ? base44.entities.ProjectBOQ.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 60_000,
  });
  const { data: irs = [] } = useQuery({
    queryKey: ['siteProductionIRs', projectId],
    queryFn: () => projectId ? base44.entities.ClientInspectionRequest.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 60_000,
  });
  const { data: irItems = [] } = useQuery({
    queryKey: ['siteProductionIRItems', projectId],
    queryFn: () => base44.entities.ClientInspectionRequestItem.list('-created_date', 500),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const rows = useMemo(() => {
    const irIds = new Set(irs.map((i) => i.id));
    const projectItems = irItems.filter((it) => irIds.has(it.ir_id));
    const completedByBOQ = {};
    projectItems.forEach((it) => {
      const cur = completedByBOQ[it.boq_item_id] || 0;
      completedByBOQ[it.boq_item_id] = Math.max(cur, it.cumulative_quantity || 0);
    });
    return boqItems
      .filter((b) => b.level === 3 && b.quantity > 0)
      .map((b) => {
        const completed = completedByBOQ[b.id] || 0;
        const pct = b.quantity > 0 ? Math.min(100, (completed / b.quantity) * 100) : 0;
        return { boq: b, target: b.quantity, completed, pct, uom: b.uom };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [boqItems, irs, irItems]);

  const totals = useMemo(() => {
    const totalTarget = rows.reduce((s, r) => s + r.target, 0);
    const totalCompleted = rows.reduce((s, r) => s + r.completed, 0);
    const overallPct = totalTarget > 0 ? (totalCompleted / totalTarget) * 100 : 0;
    const today = todayStr();
    const todayIRIds = new Set(irs.filter((i) => (i.created_date || '').slice(0, 10) === today).map((i) => i.id));
    const todayProduction = irItems
      .filter((it) => todayIRIds.has(it.ir_id))
      .reduce((s, it) => s + (it.current_quantity || 0), 0);
    return { totalTarget, totalCompleted, overallPct, todayProduction };
  }, [rows, irs, irItems]);

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/site/progress')}>
          <ChevronLeft className={cn('h-5 w-5', isRTL && 'rotate-180')} />
        </Button>
        <h1 className="font-display text-[16px] font-semibold text-slate-800 flex-1 flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4 text-erp-accent" />
          {language === 'ar' ? 'تتبع الإنتاج' : 'Production Tracking'}
        </h1>
      </div>

      <Card className="p-3 border-erp-border mb-3">
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-full h-10 text-[13px]">
            <SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select project'} />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{language === 'ar' ? p.project_name_ar : p.project_name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {!projectId ? (
        <Card className="p-8 text-center text-[12px] text-slate-400 border-erp-border">
          {language === 'ar' ? 'اختر مشروع لعرض الإنتاج' : 'Select a project to view production'}
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <Card className="p-3 border-erp-border">
              <div className="flex items-center gap-1.5 text-erp-accent mb-1"><BarChart3 className="h-3.5 w-3.5" /><span className="text-[11px] font-medium">{language === 'ar' ? 'نسبة الإنجاز' : 'Overall'}</span></div>
              <div className="font-mono text-[18px] font-semibold text-slate-800">{formatNumber(totals.overallPct, 1)}%</div>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-erp-accent rounded-full transition-all" style={{ width: `${Math.min(100, totals.overallPct)}%` }} />
              </div>
            </Card>
            <Card className="p-3 border-erp-border">
              <div className="flex items-center gap-1.5 text-erp-emerald mb-1"><CheckCircle2 className="h-3.5 w-3.5" /><span className="text-[11px] font-medium">{language === 'ar' ? 'المنجز' : 'Completed'}</span></div>
              <div className="font-mono text-[14px] font-semibold text-slate-800">{formatNumber(totals.totalCompleted, 0)} / {formatNumber(totals.totalTarget, 0)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{language === 'ar' ? 'من إجمالي البنود' : 'of BOQ targets'}</div>
            </Card>
          </div>
          <Card className="p-3 border-erp-border mb-3 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center"><Zap className="h-4 w-4 text-erp-amber" /></div>
            <div>
              <div className="font-mono text-[16px] font-semibold text-slate-800">{formatNumber(totals.todayProduction, 0)}</div>
              <div className="text-[10px] text-slate-500">{language === 'ar' ? 'إنتاج اليوم' : "Today's Production"}</div>
            </div>
          </Card>

          <div className="text-[13px] font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-slate-400" />
            {language === 'ar' ? 'البنود مقابل المستهدف' : 'Items vs Target'} ({rows.length})
          </div>
          <div className="space-y-2">
            {rows.length === 0 ? (
              <Card className="p-6 text-center text-[12px] text-slate-400 border-erp-border">
                {language === 'ar' ? 'لا توجد بنود BOQ' : 'No BOQ line items'}
              </Card>
            ) : rows.map((r) => (
              <Card key={r.boq.id} className="p-3 border-erp-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] text-slate-500">{r.boq.system_code || r.boq.external_code || '—'}</span>
                  <span className={cn('text-[11px] font-mono font-semibold', r.pct >= 100 ? 'text-erp-emerald' : 'text-erp-accent')}>{formatNumber(r.pct, 0)}%</span>
                </div>
                <p className="text-[12px] text-slate-700 line-clamp-1 mb-1.5">{r.boq.brief_description || r.boq.item_description}</p>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-1">
                  <div className={cn('h-full rounded-full transition-all', r.pct >= 100 ? 'bg-erp-emerald' : 'bg-erp-accent')} style={{ width: `${Math.min(100, r.pct)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{formatNumber(r.completed, 0)} / {formatNumber(r.target, 0)} {r.uom || ''}</span>
                  <span>{formatNumber(Math.max(0, r.target - r.completed), 0)} {language === 'ar' ? 'متبقي' : 'remaining'}</span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}