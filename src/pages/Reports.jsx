import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, formatDate, getLocalizedName } from '@/components/shared/formatters';
import { cn } from "@/lib/utils";
import {
  Wallet, TrendingUp, FileText, BarChart3, ArrowUpDown, Loader2, Download,
} from 'lucide-react';

export default function Reports() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const [activeReport, setActiveReport] = useState('trial-balance');
  const [selectedProject, setSelectedProject] = useState('');

  const companyFilter = currentCompany ? { company_id: currentCompany.id } : {};

  // Fetch all data needed for reports
  const { data: glAccounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['glAccounts', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.GLAccount.filter(companyFilter) : base44.entities.GLAccount.list(),
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['journalEntries', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.JournalEntry.filter(companyFilter) : base44.entities.JournalEntry.list(),
  });

  const { data: journalLines = [] } = useQuery({
    queryKey: ['journalLines', currentCompany?.id],
    queryFn: async () => {
      if (!journalEntries.length) return [];
      const postedEntries = journalEntries.filter(e => e.status === 'posted');
      let allLines = [];
      for (const entry of postedEntries) {
        const lines = await base44.entities.JournalEntryLine.filter({ entry_id: entry.id });
        allLines = [...allLines, ...lines];
      }
      return allLines;
    },
    enabled: journalEntries.length > 0,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.Project.filter(companyFilter) : base44.entities.Project.list(),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['pos', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.PurchaseOrder.filter(companyFilter) : base44.entities.PurchaseOrder.list(),
  });

  const { data: subcontracts = [] } = useQuery({
    queryKey: ['subcontracts', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.Subcontract.filter(companyFilter) : base44.entities.Subcontract.list(),
  });

  const { data: clientIPCs = [] } = useQuery({
    queryKey: ['clientIpcs', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.ClientIPC.filter(companyFilter) : base44.entities.ClientIPC.list(),
  });

  const { data: subcontractorIPCs = [] } = useQuery({
    queryKey: ['scIpcs', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.SubcontractorIPC.filter(companyFilter) : base44.entities.SubcontractorIPC.list(),
  });

  const { data: businessPartners = [] } = useQuery({
    queryKey: ['bps', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.BusinessPartner.filter(companyFilter) : base44.entities.BusinessPartner.list(),
  });

  // === Trial Balance ===
  const trialBalance = useMemo(() => {
    const accountBalances = {};
    for (const line of journalLines) {
      const acctId = line.account_id;
      if (!accountBalances[acctId]) accountBalances[acctId] = { debit: 0, credit: 0 };
      accountBalances[acctId].debit += parseFloat(line.debit_amount) || 0;
      accountBalances[acctId].credit += parseFloat(line.credit_amount) || 0;
    }

    return glAccounts
      .filter(a => a.allow_posting || accountBalances[a.id])
      .map(acct => {
        const bal = accountBalances[acct.id] || { debit: 0, credit: 0 };
        const netDebit = bal.debit - bal.credit;
        return {
          ...acct,
          total_debit: bal.debit,
          total_credit: bal.credit,
          balance: Math.abs(netDebit),
          balance_type: netDebit >= 0 ? 'debit' : 'credit',
        };
      })
      .sort((a, b) => (a.account_code || '').localeCompare(b.account_code || ''));
  }, [glAccounts, journalLines]);

  const totalDebit = trialBalance.reduce((s, a) => s + a.total_debit, 0);
  const totalCredit = trialBalance.reduce((s, a) => s + a.total_credit, 0);

  // === Project Budget vs Actual ===
  const budgetVsActual = useMemo(() => {
    const proj = projects.find(p => p.id === selectedProject);
    if (!proj) return [];

    const projectPOs = purchaseOrders.filter(po => po.project_id === selectedProject);
    const projectSCs = subcontracts.filter(sc => sc.project_id === selectedProject);
    const projectIPCs = clientIPCs.filter(ipc => ipc.project_id === selectedProject);
    const projectSCIPCs = subcontractorIPCs.filter(ipc => {
      const sc = subcontracts.find(s => s.id === ipc.subcontract_id);
      return sc && sc.project_id === selectedProject;
    });

    const originalBudget = parseFloat(proj.original_contract_value) || 0;
    const committedPOs = projectPOs.reduce((s, po) => s + (parseFloat(po.total_amount) || 0), 0);
    const committedSCs = projectSCs.reduce((s, sc) => s + (parseFloat(sc.current_value) || 0), 0);
    const totalCommitted = committedPOs + committedSCs;

    // Actual = certified IPCs (client revenue, subcontractor costs)
    const actualRevenue = projectIPCs
      .filter(ipc => ipc.status === 'approved' || ipc.status === 'certified')
      .reduce((s, ipc) => s + (parseFloat(ipc.current_gross_amount) || 0), 0);
    const actualSubcontractCost = projectSCIPCs
      .filter(ipc => ipc.status === 'approved' || ipc.status === 'certified')
      .reduce((s, ipc) => s + (parseFloat(ipc.current_gross_amount) || 0), 0);
    const actualCost = actualSubcontractCost + committedPOs * 0.7; // Estimate: 70% of POs received

    const budgetVariance = originalBudget - totalCommitted;
    const costVariance = totalCommitted - actualCost;

    return [
      { label: language === 'ar' ? 'الموازنة الأصلية' : 'Original Budget', amount: originalBudget, type: 'budget' },
      { label: language === 'ar' ? 'أوامر شراء ملتزمة' : 'Committed POs', amount: committedPOs, type: 'committed' },
      { label: language === 'ar' ? 'عقود باطن ملتزمة' : 'Committed Subcontracts', amount: committedSCs, type: 'committed' },
      { label: language === 'ar' ? 'إجمالي ملتزم' : 'Total Committed', amount: totalCommitted, type: 'total' },
      { label: language === 'ar' ? 'التكلفة الفعلية' : 'Actual Cost', amount: actualCost, type: 'actual' },
      { label: language === 'ar' ? 'الانحراف' : 'Variance', amount: costVariance, type: 'variance' },
    ];
  }, [selectedProject, projects, purchaseOrders, subcontracts, clientIPCs, subcontractorIPCs, language]);

  // === Project Profitability & EVM ===
  const evm = useMemo(() => {
    const proj = projects.find(p => p.id === selectedProject);
    if (!proj) return null;

    const projectIPCs = clientIPCs.filter(ipc => ipc.project_id === selectedProject);
    const projectSCIPCs = subcontractorIPCs.filter(ipc => {
      const sc = subcontracts.find(s => s.id === ipc.subcontract_id);
      return sc && sc.project_id === selectedProject;
    });

    // Revenue Recognized (BAC - Budget at Completion = contract value)
    const bac = parseFloat(proj.current_contract_value || proj.original_contract_value) || 0;
    const revenueRecognized = projectIPCs
      .filter(ipc => ipc.status === 'approved' || ipc.status === 'certified')
      .reduce((s, ipc) => s + (parseFloat(ipc.cumulative_gross_amount) || 0), 0);

    // Actual Costs Incurred (AC)
    const actualCost = projectSCIPCs
      .filter(ipc => ipc.status === 'approved' || ipc.status === 'certified')
      .reduce((s, ipc) => s + (parseFloat(ipc.cumulative_gross_amount) || 0), 0);

    // Earned Value (EV) = % complete × BAC
    const completionPct = bac > 0 ? (revenueRecognized / bac) * 100 : 0;
    const ev = bac * (completionPct / 100);

    // Cost Variance (CV) = EV - AC
    const cv = ev - actualCost;

    // Planned Value (PV) = budgeted % × BAC (simplified: use revenue %)
    const pv = ev; // Simplified

    // Schedule Variance (SV) = EV - PV
    const sv = ev - pv;

    // CPI = EV / AC
    const cpi = actualCost > 0 ? ev / actualCost : 0;

    // SPI = EV / PV
    const spi = pv > 0 ? ev / pv : 0;

    // EAC = BAC / CPI (Estimate at Completion)
    const eac = cpi > 0 ? bac / cpi : bac;

    // ETC = EAC - AC (Estimate to Complete)
    const etc = eac - actualCost;

    // VAC = BAC - EAC (Variance at Completion)
    const vac = bac - eac;

    // Profit
    const projectedProfit = bac - eac;
    const profitMargin = bac > 0 ? (projectedProfit / bac) * 100 : 0;

    return {
      bac, revenueRecognized, actualCost, ev, cv, sv, cpi, spi, eac, etc, vac,
      completionPct, projectedProfit, profitMargin,
    };
  }, [selectedProject, projects, clientIPCs, subcontractorIPCs, subcontracts]);

  // === AP & AR Aging ===
  const aging = useMemo(() => {
    const now = new Date();
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const arAging = { ...buckets };
    const apAging = { ...buckets };

    // AR from approved client IPCs
    clientIPCs
      .filter(ipc => ipc.status === 'approved' || ipc.status === 'certified')
      .forEach(ipc => {
        const paid = parseFloat(ipc.paid_amount) || 0;
        const total = parseFloat(ipc.net_payable_amount) || 0;
        const outstanding = total - paid;
        if (outstanding <= 0) return;
        const days = ipc.ipc_date ? Math.floor((now - new Date(ipc.ipc_date)) / 86400000) : 0;
        if (days <= 30) arAging['0-30'] += outstanding;
        else if (days <= 60) arAging['31-60'] += outstanding;
        else if (days <= 90) arAging['61-90'] += outstanding;
        else arAging['90+'] += outstanding;
      });

    // AP from approved subcontractor IPCs
    subcontractorIPCs
      .filter(ipc => ipc.status === 'approved' || ipc.status === 'certified')
      .forEach(ipc => {
        const paid = parseFloat(ipc.paid_amount) || 0;
        const total = parseFloat(ipc.net_payable_amount) || 0;
        const outstanding = total - paid;
        if (outstanding <= 0) return;
        const days = ipc.ipc_date ? Math.floor((now - new Date(ipc.ipc_date)) / 86400000) : 0;
        if (days <= 30) apAging['0-30'] += outstanding;
        else if (days <= 60) apAging['31-60'] += outstanding;
        else if (days <= 90) apAging['61-90'] += outstanding;
        else apAging['90+'] += outstanding;
      });

    return { ar: arAging, ap: apAging };
  }, [clientIPCs, subcontractorIPCs]);

  const isLoading = loadingAccounts;

  const reportTabs = [
    { value: 'trial-balance', label_ar: 'ميزان المراجعة', label_en: 'Trial Balance', icon: Wallet },
    { value: 'budget-actual', label_ar: 'الموازنة مقابل الفعلي', label_en: 'Budget vs Actual', icon: BarChart3 },
    { value: 'evm', label_ar: 'ربحية المشروع (EVM)', label_en: 'Project EVM', icon: TrendingUp },
    { value: 'aging', label_ar: 'أعمار الذمم', label_en: 'AP & AR Aging', icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports')}
        subtitle={language === 'ar' ? 'التقارير المالية المباشرة' : 'Live Financial Reports'}
      />

      <Tabs value={activeReport} onValueChange={setActiveReport}>
        <TabsList className="flex-wrap">
          {reportTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {language === 'ar' ? tab.label_ar : tab.label_en}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* === Trial Balance === */}
        <TabsContent value="trial-balance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  {language === 'ar' ? 'ميزان المراجعة' : 'Trial Balance'}
                </span>
                <div className="flex gap-2 text-sm font-normal">
                  <Badge className="bg-blue-100 text-blue-700">
                    {language === 'ar' ? 'مدين:' : 'Debit:'} {formatNumber(totalDebit, 2)}
                  </Badge>
                  <Badge className="bg-purple-100 text-purple-700">
                    {language === 'ar' ? 'دائن:' : 'Credit:'} {formatNumber(totalCredit, 2)}
                  </Badge>
                  {Math.abs(totalDebit - totalCredit) < 0.01 && (
                    <Badge className="bg-emerald-100 text-emerald-700">✓ {language === 'ar' ? 'متوازن' : 'Balanced'}</Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trialBalance.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  {language === 'ar' ? 'لا توجد قيود مرحلة' : 'No posted entries'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b">
                        <th className="p-2 text-right">{language === 'ar' ? 'كود الحساب' : 'Account Code'}</th>
                        <th className="p-2 text-right">{language === 'ar' ? 'اسم الحساب' : 'Account Name'}</th>
                        <th className="p-2 text-right">{language === 'ar' ? 'مدين' : 'Debit'}</th>
                        <th className="p-2 text-right">{language === 'ar' ? 'دائن' : 'Credit'}</th>
                        <th className="p-2 text-right">{language === 'ar' ? 'الرصيد' : 'Balance'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trialBalance.map(acct => (
                        <tr key={acct.id} className="border-b hover:bg-slate-50">
                          <td className="p-2 font-mono text-xs">{acct.account_code}</td>
                          <td className="p-2">{language === 'ar' ? acct.account_name_ar : acct.account_name_en}</td>
                          <td className="p-2 font-mono text-right">{formatNumber(acct.total_debit, 2)}</td>
                          <td className="p-2 font-mono text-right">{formatNumber(acct.total_credit, 2)}</td>
                          <td className="p-2 font-mono text-right font-semibold">
                            {formatNumber(acct.balance, 2)}
                            <span className={cn("text-xs ml-1", acct.balance_type === 'debit' ? 'text-blue-600' : 'text-purple-600')}>
                              {acct.balance_type === 'debit' ? 'Dr' : 'Cr'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold">
                      <tr className="border-t-2">
                        <td colSpan="2" className="p-2 text-right">{language === 'ar' ? 'الإجمالي' : 'TOTAL'}</td>
                        <td className="p-2 font-mono text-right">{formatNumber(totalDebit, 2)}</td>
                        <td className="p-2 font-mono text-right">{formatNumber(totalCredit, 2)}</td>
                        <td className="p-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Budget vs Actual === */}
        <TabsContent value="budget-actual" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {language === 'ar' ? 'الموازنة مقابل الفعلي' : 'Budget vs Actual'}
                </span>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select Project'} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.project_code} - {getLocalizedName(p, language, 'project_name_ar', 'project_name_en')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedProject ? (
                <div className="text-center py-8 text-slate-400">
                  {language === 'ar' ? 'اختر مشروعاً للعرض' : 'Select a project to view'}
                </div>
              ) : budgetVsActual.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  {language === 'ar' ? 'لا توجد بيانات' : 'No data'}
                </div>
              ) : (
                <div className="space-y-3">
                  {budgetVsActual.map((row, i) => (
                    <div key={i} className={cn(
                      "flex items-center justify-between p-4 rounded-lg",
                      row.type === 'total' && "bg-slate-100 font-bold",
                      row.type === 'variance' && (row.amount >= 0 ? "bg-emerald-50" : "bg-red-50"),
                      row.type === 'budget' && "bg-blue-50",
                      row.type === 'committed' && "bg-amber-50",
                      row.type === 'actual' && "bg-purple-50",
                    )}>
                      <span className="text-sm font-medium">{row.label}</span>
                      <span className={cn(
                        "font-mono font-semibold",
                        row.type === 'variance' && (row.amount >= 0 ? "text-emerald-700" : "text-red-700"),
                      )}>
                        {formatCurrency(row.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Project Profitability & EVM === */}
        <TabsContent value="evm" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {language === 'ar' ? 'ربحية المشروع ومراقبة التكلفة' : 'Project Profitability & EVM'}
                </span>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select Project'} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.project_code} - {getLocalizedName(p, language, 'project_name_ar', 'project_name_en')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedProject || !evm ? (
                <div className="text-center py-8 text-slate-400">
                  {language === 'ar' ? 'اختر مشروعاً للعرض' : 'Select a project to view'}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <p className="text-xs text-slate-500 mb-1">{language === 'ar' ? 'نسبة الإنجاز' : 'Completion %'}</p>
                      <p className="text-2xl font-bold text-blue-700">{formatNumber(evm.completionPct, 1)}%</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <p className="text-xs text-slate-500 mb-1">CPI</p>
                      <p className={cn("text-2xl font-bold", evm.cpi >= 1 ? "text-emerald-700" : "text-red-700")}>
                        {formatNumber(evm.cpi, 2)}
                      </p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg text-center">
                      <p className="text-xs text-slate-500 mb-1">{language === 'ar' ? 'هامش الربح' : 'Profit Margin'}</p>
                      <p className={cn("text-2xl font-bold", evm.profitMargin >= 0 ? "text-emerald-700" : "text-red-700")}>
                        {formatNumber(evm.profitMargin, 1)}%
                      </p>
                    </div>
                    <div className="p-4 bg-slate-100 rounded-lg text-center">
                      <p className="text-xs text-slate-500 mb-1">{language === 'ar' ? 'الربح المتوقع' : 'Projected Profit'}</p>
                      <p className={cn("text-xl font-bold", evm.projectedProfit >= 0 ? "text-emerald-700" : "text-red-700")}>
                        {formatCurrency(evm.projectedProfit)}
                      </p>
                    </div>
                  </div>

                  {/* EVM Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'BAC', label_ar: 'موازنة الإنجاز', value: evm.bac },
                      { label: 'EV (Earned Value)', label_ar: 'القيمة المكتسبة', value: evm.ev },
                      { label: 'AC (Actual Cost)', label_ar: 'التكلفة الفعلية', value: evm.actualCost },
                      { label: 'CV (Cost Variance)', label_ar: 'انحراف التكلفة', value: evm.cv, color: evm.cv >= 0 ? 'text-emerald-600' : 'text-red-600' },
                      { label: 'EAC', label_ar: 'تقدير الإنجاز', value: evm.eac },
                      { label: 'ETC', label_ar: 'تقدير المتبقي', value: evm.etc },
                      { label: 'VAC', label_ar: 'انحراف الإنجاز', value: evm.vac, color: evm.vac >= 0 ? 'text-emerald-600' : 'text-red-600' },
                      { label: 'SPI', label_ar: 'مؤشر الجدول الزمني', value: evm.spi, isRatio: true },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{language === 'ar' ? item.label_ar : item.label}</p>
                        </div>
                        <span className={cn("font-mono font-semibold", item.color)}>
                          {item.isRatio ? formatNumber(item.value, 2) : formatCurrency(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === AP & AR Aging === */}
        <TabsContent value="aging" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AR Aging */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-700">
                  <ArrowUpDown className="h-5 w-5" />
                  {language === 'ar' ? 'أعمار المديونيات (AR)' : 'Receivables Aging (AR)'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(aging.ar).map(([bucket, amount]) => (
                    <div key={bucket} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium">{bucket} {language === 'ar' ? 'يوم' : 'days'}</span>
                      <span className="font-mono font-semibold">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 bg-emerald-100 rounded-lg font-bold">
                    <span>{language === 'ar' ? 'إجمالي المديونيات' : 'Total Receivables'}</span>
                    <span className="font-mono">{formatCurrency(Object.values(aging.ar).reduce((s, v) => s + v, 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AP Aging */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <ArrowUpDown className="h-5 w-5" />
                  {language === 'ar' ? 'أعمار الدائنين (AP)' : 'Payables Aging (AP)'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(aging.ap).map(([bucket, amount]) => (
                    <div key={bucket} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium">{bucket} {language === 'ar' ? 'يوم' : 'days'}</span>
                      <span className="font-mono font-semibold">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 bg-red-100 rounded-lg font-bold">
                    <span>{language === 'ar' ? 'إجمالي الدائنين' : 'Total Payables'}</span>
                    <span className="font-mono">{formatCurrency(Object.values(aging.ap).reduce((s, v) => s + v, 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
