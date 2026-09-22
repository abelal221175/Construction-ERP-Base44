import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import DashboardCard from '@/components/dashboard/DashboardCard';
import KpiTile from '@/components/dashboard/KpiTile';
import CustomizePanel from '@/components/dashboard/CustomizePanel';
import DrillDownSheet from '@/components/dashboard/DrillDownSheet';
import DateRangeFilter, { getPeriodRange, inPeriod } from '@/components/dashboard/DateRangeFilter';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import CostAnalysisWidget from '@/components/dashboard/CostAnalysisWidget';
import { WIDGET_CATALOG, DEFAULT_HOME_WIDGETS, TABS } from '@/components/dashboard/widgetCatalog';

const groupBy = (arr, key) => {
  const map = {};
  arr.forEach((x) => {
    const k = x[key] || 'unknown';
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
};

const monthlyCount = (arr, dateField) => {
  const now = new Date();
  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, value: 0 });
  }
  arr.forEach((x) => {
    const d = new Date(x[dateField] || x.created_date);
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b = buckets.find((c) => c.key === key);
    if (b) b.value++;
  });
  return buckets;
};

const last6Months = (ipcs) => {
  const map = {};
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('en', { month: 'short' });
    months.push(key);
    map[key] = 0;
  }
  ipcs.forEach((i) => {
    const d = new Date(i.ipc_date || i.created_date);
    if (isNaN(d.getTime())) return;
    const key = d.toLocaleDateString('en', { month: 'short' });
    if (map[key] !== undefined) map[key]++;
  });
  return months.map((name) => ({ name, value: map[name] }));
};

const DATE_FIELDS = {
  Project: 'start_date',
  PurchaseOrder: 'po_date',
  PurchaseRequisition: 'required_date',
  ClientIPC: 'ipc_date',
  Subcontract: 'contract_date',
  BusinessPartner: 'created_date',
  GoodsReceivedNote: 'grn_date',
  ApprovalRequest: 'requested_at',
};

export default function Dashboard() {
  const { language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const [activeTab, setActiveTab] = useState('home');
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [period, setPeriod] = useState('year');
  const [drillWidget, setDrillWidget] = useState(null);
  const [drillSegment, setDrillSegment] = useState(null);
  const openDrill = (w, seg) => { setDrillWidget(w); setDrillSegment(seg || null); };

  const range = useMemo(() => getPeriodRange(period), [period]);

  const companyFilter = currentCompany ? { company_id: currentCompany.id } : {};
  const q = (entity, key) => ({
    queryKey: [key || entity, currentCompany?.id],
    queryFn: () =>
      currentCompany ? base44.entities[entity].filter(companyFilter) : base44.entities[entity].list(),
    staleTime: 60_000,
  });

  const { data: projects = [] } = useQuery(q('Project'));
  const { data: pos = [] } = useQuery(q('PurchaseOrder'));
  const { data: prs = [] } = useQuery(q('PurchaseRequisition'));
  const { data: ipcs = [] } = useQuery(q('ClientIPC'));
  const { data: subcontracts = [] } = useQuery(q('Subcontract'));
  const { data: bps = [] } = useQuery(q('BusinessPartner'));
  const { data: grns = [] } = useQuery(q('GoodsReceivedNote'));
  const { data: approvals = [] } = useQuery(q('ApprovalRequest', 'pendingApprovals'));
  const { data: bankAccounts = [] } = useQuery(q('BankAccount'));

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    staleTime: 300_000,
  });
  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings', user?.id],
    enabled: !!user,
    queryFn: () => base44.entities.AppSettings.filter({ user_id: user.id }),
    staleTime: 30_000,
  });
  const userSettings = settings[0];
  let savedWidgets = [];
  try {
    savedWidgets = userSettings?.dashboard_widgets ? JSON.parse(userSettings.dashboard_widgets) : [];
  } catch {
    savedWidgets = [];
  }
  const validIds = new Set(WIDGET_CATALOG.map((w) => w.id));
  savedWidgets = savedWidgets.filter((id) => validIds.has(id));
  const homeWidgetIds = savedWidgets.length ? savedWidgets : DEFAULT_HOME_WIDGETS;

  // Period-filtered arrays (for KPI values + charts)
  const f = useMemo(() => ({
    projects: projects.filter((r) => inPeriod(r[DATE_FIELDS.Project], range)),
    pos: pos.filter((r) => inPeriod(r[DATE_FIELDS.PurchaseOrder], range)),
    prs: prs.filter((r) => inPeriod(r[DATE_FIELDS.PurchaseRequisition], range)),
    ipcs: ipcs.filter((r) => inPeriod(r[DATE_FIELDS.ClientIPC], range)),
    subcontracts: subcontracts.filter((r) => inPeriod(r[DATE_FIELDS.Subcontract], range)),
    bps: bps.filter((r) => inPeriod(r[DATE_FIELDS.BusinessPartner], range)),
    grns: grns.filter((r) => inPeriod(r[DATE_FIELDS.GoodsReceivedNote], range)),
    approvals: approvals.filter((r) => inPeriod(r[DATE_FIELDS.ApprovalRequest], range)),
  }), [projects, pos, prs, ipcs, subcontracts, bps, grns, approvals, range]);

  const values = useMemo(() => ({
    activeProjects: f.projects.filter((p) => ['active', 'in_progress', 'on_going'].includes(p.status)).length,
    totalProjects: f.projects.length,
    totalContractValue: f.projects.reduce((s, p) => s + (p.contract_value || p.original_contract_value || 0), 0),
    businessPartners: f.bps.length,
    openPOs: f.pos.filter((p) => !['closed', 'cancelled'].includes(p.status)).length,
    openPRs: f.prs.filter((p) => !['closed', 'cancelled', 'fulfilled'].includes(p.status)).length,
    goodsReceived: f.grns.length,
    clientIpcs: f.ipcs.length,
    unpostedIpcs: f.ipcs.filter((i) => !['posted', 'cancelled'].includes(i.status)).length,
    pendingApprovals: f.approvals.filter((a) => a.status === 'pending').length,
    cashPosition: bankAccounts.reduce((s, b) => s + (b.current_balance || 0), 0),
    subcontracts: f.subcontracts.length,
  }), [f, bankAccounts]);

  // Sparkline series use full 6-month history (unfiltered) for trend context
  const series = useMemo(() => ({
    activeProjects: monthlyCount(projects, 'start_date'),
    totalProjects: monthlyCount(projects, 'start_date'),
    openPOs: monthlyCount(pos, 'po_date'),
    openPRs: monthlyCount(prs, 'required_date'),
    clientIpcs: monthlyCount(ipcs, 'ipc_date'),
    unpostedIpcs: monthlyCount(ipcs, 'ipc_date'),
    pendingApprovals: monthlyCount(approvals, 'requested_at'),
    subcontracts: monthlyCount(subcontracts, 'contract_date'),
    businessPartners: monthlyCount(bps, 'created_date'),
    goodsReceived: monthlyCount(grns, 'grn_date'),
  }), [projects, pos, prs, ipcs, subcontracts, bps, grns, approvals]);

  const charts = useMemo(() => ({
    projectsByStatus: groupBy(f.projects, 'status'),
    topProjects: [...f.projects]
      .sort((a, b) => (b.contract_value || b.original_contract_value || 0) - (a.contract_value || a.original_contract_value || 0))
      .slice(0, 6)
      .map((p) => ({ name: p.project_code || '—', value: p.contract_value || p.original_contract_value || 0 })),
    posByStatus: groupBy(f.pos, 'status'),
    monthlyIpcs: last6Months(f.ipcs),
  }), [f]);

  const visibleWidgets =
    activeTab === 'home'
      ? homeWidgetIds.map((id) => WIDGET_CATALOG.find((w) => w.id === id)).filter(Boolean)
      : WIDGET_CATALOG.filter((w) => w.category === activeTab);

  const dataWidgets = visibleWidgets.filter((w) => w.type === 'data');
  const recentWidgets = visibleWidgets.filter((w) => w.type === 'recent');
  const costWidgets = visibleWidgets.filter((w) => w.type === 'cost');
  const otherWidgets = visibleWidgets.filter((w) => ['chart', 'action', 'quicklink'].includes(w.type));

  const recentData = { pos: f.pos, ipcs: f.ipcs, approvals: f.approvals };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="bg-quartz-canvas -mx-4 lg:-mx-6 -my-4 lg:-my-6 px-4 lg:px-6 py-4 lg:py-6 min-h-[calc(100vh-3rem)]"
    >
      {/* Tab bar */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center bg-quartz-nav rounded-lg p-1 shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative px-3.5 py-1.5 text-[13px] font-medium rounded-md transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-white/60 hover:text-white/90'
              )}
            >
              {language === 'ar' ? tab.labelAr : tab.labelEn}
              {activeTab === tab.id && (
                <span className="absolute bottom-0.5 left-2 right-2 h-0.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <DateRangeFilter period={period} onChange={setPeriod} language={language} />
          {activeTab === 'home' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomizeOpen(true)}
              className="bg-white border-quartz-border text-slate-700 hover:bg-slate-50 gap-1.5 text-[12px] h-8"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {language === 'ar' ? 'تخصيص' : 'Customize'}
            </Button>
          )}
        </div>
      </div>

      {/* Sticky KPI strip */}
      {dataWidgets.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 lg:-mx-6 px-4 lg:px-6 py-2.5 mb-3 bg-quartz-canvas border-b border-quartz-border">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {dataWidgets.map((w) => (
              <KpiTile
                key={w.id}
                widget={w}
                value={w.valueKey ? values[w.valueKey] : 0}
                seriesData={w.valueKey ? series[w.valueKey] : undefined}
                language={language}
                onDrillDown={openDrill}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <RecentTransactions recentWidgets={recentWidgets} data={recentData} language={language} />

      {/* Cost analysis */}
      {costWidgets.length > 0 && (
        <div className="mb-3">
          {costWidgets.map((w) => (
            <CostAnalysisWidget key={w.id} projects={f.projects} language={language} />
          ))}
        </div>
      )}

      {/* Section label */}
      {otherWidgets.length > 0 && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-quartz-muted mb-2">
          {language === 'ar'
            ? TABS.find((t) => t.id === activeTab)?.labelAr
            : TABS.find((t) => t.id === activeTab)?.labelEn}
        </p>
      )}

      {/* Dense card grid */}
      {otherWidgets.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
          {otherWidgets.map((w) => (
            <DashboardCard
              key={w.id}
              widget={w}
              chartData={w.chartKey ? charts[w.chartKey] : undefined}
              language={language}
              onDrillDown={openDrill}
            />
          ))}
        </div>
      ) : (
        dataWidgets.length === 0 && recentWidgets.length === 0 && costWidgets.length === 0 && (
          <div className="bg-quartz-card rounded-lg p-10 text-center text-quartz-muted border border-quartz-border">
            <p className="text-sm">
              {language === 'ar'
                ? 'لا توجد بطاقات مختارة. استخدم زر التخصيص لإضافة بطاقات.'
                : 'No widgets selected. Use the Customize button to add cards.'}
            </p>
            {activeTab === 'home' && (
              <Button className="mt-3" onClick={() => setCustomizeOpen(true)}>
                <Settings2 className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'تخصيص الآن' : 'Customize now'}
              </Button>
            )}
          </div>
        )
      )}

      <DrillDownSheet
        open={!!drillWidget}
        onClose={() => setDrillWidget(null)}
        widget={drillWidget}
        chartData={drillWidget?.chartKey ? charts[drillWidget.chartKey] : undefined}
        language={language}
        initialSegment={drillSegment}
      />

      <CustomizePanel
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        selectedIds={homeWidgetIds}
        settingsId={userSettings?.id}
        userId={user?.id}
        language={language}
      />
    </div>
  );
}