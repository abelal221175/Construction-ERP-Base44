import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '@/components/shared/CompanyContext';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ExternalLink, Search, ChevronRight, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DRILL_CONFIG } from './drillConfig';
import { formatCurrency, formatNumber, formatDate, formatPercentage } from '@/components/shared/formatters';
import { cn } from '@/lib/utils';

const ELEMENT_LABELS = {
  material: { ar: 'مواد', en: 'Material' },
  subcontractor: { ar: 'مقاول باطن', en: 'Subcontractor' },
  labor: { ar: 'عمالة', en: 'Labor' },
  equipment: { ar: 'معدات', en: 'Equipment' },
  service: { ar: 'خدمات', en: 'Service' },
  indirect: { ar: 'تكاليف غير مباشرة', en: 'Indirect' },
};

const BOQ_COLS = [
  { key: 'system_code', labelAr: 'الكود', labelEn: 'Code' },
  { key: 'item_description', labelAr: 'البند', labelEn: 'Item' },
  { key: 'quantity', labelAr: 'الكمية', labelEn: 'Qty', type: 'number' },
  { key: 'uom', labelAr: 'الوحدة', labelEn: 'UoM' },
  { key: 'unit_price', labelAr: 'سعر الوحدة', labelEn: 'Unit Price', type: 'currency' },
  { key: 'total_amount', labelAr: 'الإجمالي', labelEn: 'Total', type: 'currency' },
];

const CBS_COLS = [
  { key: 'cost_element_type', labelAr: 'عنصر التكلفة', labelEn: 'Cost Element', type: 'element' },
  { key: 'budget_amount', labelAr: 'الموازنة', labelEn: 'Budget', type: 'currency' },
  { key: 'actual_amount', labelAr: 'الفعلي', labelEn: 'Actual', type: 'currency' },
  { key: 'variance_amount', labelAr: 'الانحراف', labelEn: 'Variance', type: 'currency' },
  { key: 'variance_percentage', labelAr: 'نسبة الانحراف', labelEn: 'Var %', type: 'percentage' },
];

const renderCell = (rec, col, language) => {
  if (col.type === 'element') {
    const lbl = ELEMENT_LABELS[rec[col.key]];
    return lbl ? (language === 'ar' ? lbl.ar : lbl.en) : rec[col.key] || '-';
  }
  if (col.localized) {
    const v = rec[`${col.key}_ar`] ?? rec[`${col.key}_en`];
    return v || '-';
  }
  const v = rec[col.key];
  if (col.type === 'bool') return v ? (language === 'ar' ? 'نعم' : 'Yes') : '-';
  if (v === null || v === undefined || v === '') return '-';
  if (col.type === 'currency') return formatCurrency(Number(v), 'EGP', 0);
  if (col.type === 'date') return formatDate(v);
  if (col.type === 'number') return formatNumber(Number(v), 2);
  if (col.type === 'percentage') return formatPercentage(Number(v), 1);
  return String(v);
};

export default function DrillDownSheet({ open, onClose, widget, chartData, language, initialSegment }) {
  const { currentCompany } = useCompany();
  const [segment, setSegment] = useState(null);
  const [search, setSearch] = useState('');
  const [drillProject, setDrillProject] = useState(null);
  const [drillBoq, setDrillBoq] = useState(null);

  const config = widget ? DRILL_CONFIG[widget.valueKey || widget.chartKey] : null;
  const isProjectDrill = config?.entity === 'Project';
  const level = drillBoq ? 2 : drillProject ? 1 : 0;

  useEffect(() => {
    if (open) {
      setSegment(initialSegment || null);
      setSearch('');
      setDrillProject(null);
      setDrillBoq(null);
    }
  }, [open, widget?.id, initialSegment]);

  const companyFilter = currentCompany ? { company_id: currentCompany.id } : {};

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['drill', config?.entity, currentCompany?.id],
    enabled: open && !!config && level === 0,
    queryFn: () =>
      currentCompany
        ? base44.entities[config.entity].filter(companyFilter)
        : base44.entities[config.entity].list(),
    staleTime: 60_000,
  });

  const { data: boqItems = [], isLoading: boqLoading } = useQuery({
    queryKey: ['drillBOQ', drillProject?.id],
    enabled: isProjectDrill && level >= 1 && !!drillProject,
    queryFn: () => base44.entities.ProjectBOQ.filter({ project_id: drillProject.id }),
    staleTime: 60_000,
  });

  const { data: cbsLines = [], isLoading: cbsLoading } = useQuery({
    queryKey: ['drillCBS', drillBoq?.id],
    enabled: isProjectDrill && level === 2 && !!drillBoq,
    queryFn: () => base44.entities.BudgetLine.filter({ boq_id: drillBoq.id }),
    staleTime: 60_000,
  });

  const segments = config?.segmentField && chartData ? chartData : null;

  const filtered = useMemo(() => {
    if (!config || level !== 0) return [];
    let recs = records;
    if (config.filterFn) recs = recs.filter(config.filterFn);
    if (config.segmentField && segment) {
      const sv = config.segmentValueFn || ((r) => r[config.segmentField]);
      recs = recs.filter((r) => sv(r) === segment);
    }
    if (config.sortBy) {
      recs = [...recs].sort((a, b) =>
        config.sortDir === 'desc'
          ? (b[config.sortBy] || 0) - (a[config.sortBy] || 0)
          : (a[config.sortBy] || 0) - (b[config.sortBy] || 0)
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      recs = recs.filter((r) =>
        config.columns.some((c) => {
          const val = c.localized ? (r[`${c.key}_ar`] ?? r[`${c.key}_en`]) : r[c.key];
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }
    return recs;
  }, [records, config, segment, search, level]);

  const filteredBoq = useMemo(() => {
    if (level !== 1) return [];
    let recs = boqItems.filter((b) => b.level === 3 || !b.level);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      recs = recs.filter((r) =>
        BOQ_COLS.some((c) => {
          const val = r[c.key];
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }
    return recs;
  }, [boqItems, search, level]);

  const filteredCbs = useMemo(() => {
    if (level !== 2) return [];
    let recs = cbsLines;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      recs = recs.filter((r) => {
        const lbl = ELEMENT_LABELS[r.cost_element_type];
        const name = lbl ? (language === 'ar' ? lbl.ar : lbl.en) : r.cost_element_type;
        return name && name.toLowerCase().includes(q);
      });
    }
    return recs;
  }, [cbsLines, search, level, language]);

  if (!config) return null;

  const title = widget ? (language === 'ar' ? widget.titleAr : widget.titleEn) : '';

  const projectName = drillProject
    ? (language === 'ar' ? drillProject.project_name_ar : drillProject.project_name_en) || drillProject.project_code || drillProject.id
    : '';

  const goBack = () => {
    if (level === 2) { setDrillBoq(null); setSearch(''); }
    else if (level === 1) { setDrillProject(null); setSearch(''); }
  };

  const currentCols = level === 2 ? CBS_COLS : level === 1 ? BOQ_COLS : config.columns;
  const currentRows = level === 2 ? filteredCbs : level === 1 ? filteredBoq : filtered;
  const currentLoading = level === 2 ? cbsLoading : level === 1 ? boqLoading : isLoading;
  const rowClickable = (level === 0 && isProjectDrill) || level === 1;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[560px] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-erp-border">
          <SheetTitle className="flex items-center gap-2">
            {title}
            <span className="text-[11px] font-mono font-normal text-slate-400">
              {currentRows.length} {language === 'ar' ? 'سجل' : 'records'}
            </span>
          </SheetTitle>

          {/* Drill breadcrumb */}
          {isProjectDrill && level > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px]">
              <button
                onClick={goBack}
                className="flex items-center gap-1 text-quartz-accent hover:underline"
              >
                <ArrowLeft className="h-3 w-3" />
                {language === 'ar' ? 'رجوع' : 'Back'}
              </button>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <span className="text-slate-500">{language === 'ar' ? 'المشروعات' : 'Projects'}</span>
              {level >= 1 && (
                <>
                  <ChevronRight className="h-3 w-3 text-slate-300" />
                  <span className="text-slate-700 font-medium truncate max-w-40">{projectName}</span>
                </>
              )}
              {level === 2 && (
                <>
                  <ChevronRight className="h-3 w-3 text-slate-300" />
                  <span className="text-slate-700 font-medium truncate max-w-32">
                    {drillBoq?.system_code || drillBoq?.item_description?.slice(0, 20) || 'BOQ'}
                  </span>
                </>
              )}
            </div>
          )}
        </SheetHeader>

        {/* Segment chips (charts, level 0 only) */}
        {segments && level === 0 && (
          <div className="px-5 py-2.5 border-b border-erp-border flex flex-wrap gap-1.5">
            <button
              onClick={() => setSegment(null)}
              className={cn(
                'px-2.5 py-1 text-[11px] rounded-full border transition-colors',
                !segment ? 'bg-erp-accent text-white border-erp-accent' : 'bg-white text-slate-600 border-erp-border hover:border-erp-accent'
              )}
            >
              {language === 'ar' ? 'الكل' : 'All'}
            </button>
            {segments.map((s) => (
              <button
                key={s.name}
                onClick={() => setSegment(s.name)}
                className={cn(
                  'px-2.5 py-1 text-[11px] rounded-full border transition-colors',
                  segment === s.name ? 'bg-erp-accent text-white border-erp-accent' : 'bg-white text-slate-600 border-erp-border hover:border-erp-accent'
                )}
              >
                {s.name} · {s.value}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="px-5 py-2.5 border-b border-erp-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'ar' ? 'بحث في السجلات...' : 'Search records...'}
              className="h-8 text-[12px] pl-8"
            />
          </div>
        </div>

        {/* Hint for project drill */}
        {isProjectDrill && level === 0 && (
          <p className="px-5 py-1.5 text-[10px] text-quartz-muted border-b border-erp-border/60">
            {language === 'ar' ? 'انقر على مشروع لعرض بنود BOQ' : 'Click a project to view its BOQ items'}
          </p>
        )}
        {isProjectDrill && level === 1 && (
          <p className="px-5 py-1.5 text-[10px] text-quartz-muted border-b border-erp-border/60">
            {language === 'ar' ? 'انقر على بند لعرض انحرافات CBS' : 'Click an item to view CBS deviations'}
          </p>
        )}

        {/* Records table */}
        <div className="flex-1 overflow-auto">
          {currentLoading ? (
            <div className="p-8 text-center text-[12px] text-slate-400">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : currentRows.length === 0 ? (
            <div className="p-8 text-center text-[12px] text-slate-400">
              {language === 'ar' ? 'لا توجد سجلات' : 'No records found'}
            </div>
          ) : (
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-slate-50 border-b border-erp-border">
                <tr>
                  {currentCols.map((c) => (
                    <th
                      key={c.key}
                      className="text-right font-medium text-slate-500 px-3 py-2 whitespace-nowrap"
                    >
                      {language === 'ar' ? c.labelAr : c.labelEn}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentRows.map((rec) => {
                  const clickable = rowClickable && (level === 0 ? true : rec.level === 3 || !rec.level);
                  return (
                    <tr
                      key={rec.id}
                      onClick={() => {
                        if (level === 0 && isProjectDrill) { setDrillProject(rec); setSearch(''); }
                        else if (level === 1) { setDrillBoq(rec); setSearch(''); }
                      }}
                      className={cn(
                        'border-b border-erp-border/60',
                        clickable ? 'cursor-pointer hover:bg-blue-50/60' : 'hover:bg-slate-50'
                      )}
                    >
                      {currentCols.map((c) => (
                        <td key={c.key} className="px-3 py-2 text-slate-700 align-top">
                          {c.type === 'currency' ? (
                            <span className="font-mono">{renderCell(rec, c, language)}</span>
                          ) : c.type === 'percentage' ? (
                            <span className={cn(
                              'font-mono',
                              rec.variance_amount > 0 ? 'text-emerald-600' : rec.variance_amount < 0 ? 'text-red-600' : 'text-slate-500'
                            )}>{renderCell(rec, c, language)}</span>
                          ) : (
                            renderCell(rec, c, language)
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {widget?.link && level === 0 && (
          <SheetFooter className="border-t border-erp-border px-5 py-3">
            <Link to={createPageUrl(widget.link) + (widget.params || '')} onClick={onClose}>
              <Button variant="outline" size="sm" className="w-full gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                {language === 'ar' ? 'فتح الصفحة الكاملة' : 'Open full page'}
              </Button>
            </Link>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}