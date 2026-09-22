import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber, formatPercentage } from '@/components/shared/formatters';
import { Briefcase, FileStack, ShieldCheck, Wallet } from 'lucide-react';

export default function ExecutiveKpiBand({ projects, budgets, ipcs, approvals, bankAccounts, language, isRTL }) {
  const activeProjects = (projects || []).filter(p =>
    p.status === 'active' || p.status === 'in_progress' || p.status === 'on_going'
  );
  const list = activeProjects.length ? activeProjects : (projects || []);

  const sumBudget = list.reduce((s, p) => {
    const b = (budgets || []).filter(x => x.project_id === p.id && x.is_current_version !== false);
    const bb = b.length ? b[0] : null;
    return s + (bb?.total_budget_amount || p.contract_value || 0);
  }, 0);
  const sumActual = list.reduce((s, p) => {
    const b = (budgets || []).filter(x => x.project_id === p.id && x.is_current_version !== false);
    const bb = b.length ? b[0] : null;
    return s + (bb?.total_actual_amount || 0);
  }, 0);
  const variancePct = sumBudget ? ((sumActual - sumBudget) / sumBudget) * 100 : 0;
  const overBudget = variancePct > 0;

  const unpostedIpcs = (ipcs || []).filter(i => i.status !== 'posted' && i.status !== 'cancelled').length;
  const pendingApprovals = (approvals || []).filter(a => a.status === 'pending').length;
  const cashPosition = (bankAccounts || []).reduce((s, b) => s + (b.current_balance || 0), 0);

  const kpis = [
    {
      title: language === 'ar' ? 'تباين التكلفة - المشاريع النشطة' : 'Active Projects Cost Variance',
      value: formatPercentage(Math.abs(variancePct), 1),
      subtitle: `${language === 'ar' ? 'الميزانية' : 'Budget'} ${formatCurrency(sumBudget, 'EGP', 0)}`,
      icon: Briefcase,
      tone: overBudget ? 'ruby' : 'emerald',
      trend: overBudget ? (language === 'ar' ? 'تجاوز الميزانية' : 'Over budget') : (language === 'ar' ? 'ضمن الميزانية' : 'Under budget'),
    },
    {
      title: language === 'ar' ? 'مستخلصات غير مرحّلة' : 'Unposted IPCs',
      value: formatNumber(unpostedIpcs, 0),
      subtitle: language === 'ar' ? 'بانتظار الترحيل' : 'Awaiting posting',
      icon: FileStack,
      tone: unpostedIpcs > 0 ? 'amber' : 'emerald',
    },
    {
      title: language === 'ar' ? 'قائمة الموافقات' : 'Pending Approvals',
      value: formatNumber(pendingApprovals, 0),
      subtitle: language === 'ar' ? 'بانتظار المراجعة' : 'Awaiting review',
      icon: ShieldCheck,
      tone: pendingApprovals > 0 ? 'amber' : 'emerald',
    },
    {
      title: language === 'ar' ? 'المركز النقدي الشهري' : 'Monthly Cash Position',
      value: formatCurrency(cashPosition, 'EGP', 0),
      subtitle: language === 'ar' ? 'إجمالي الأرصدة البنكية' : 'Total bank balances',
      icon: Wallet,
      tone: 'accent',
    },
  ];

  const valueTone = {
    emerald: 'text-erp-emerald',
    amber: 'text-erp-amber',
    ruby: 'text-erp-ruby',
    accent: 'text-erp-accent',
  };
  const iconBg = {
    emerald: 'bg-emerald-50 text-erp-emerald',
    amber: 'bg-amber-50 text-erp-amber',
    ruby: 'bg-red-50 text-erp-ruby',
    accent: 'bg-blue-50 text-erp-accent',
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((k, i) => {
        const Icon = k.icon;
        return (
          <div key={i} className="bg-erp-surface border border-erp-border rounded-md p-3.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 leading-tight">{k.title}</p>
              <div className={cn("h-7 w-7 rounded flex items-center justify-center shrink-0", iconBg[k.tone])}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className={cn("font-mono text-xl font-semibold tracking-tight", valueTone[k.tone])}>{k.value}</p>
            {k.subtitle && <p className="text-[11px] text-slate-400 font-mono">{k.subtitle}</p>}
            {k.trend && <p className={cn("text-[11px] font-medium", valueTone[k.tone])}>{k.trend}</p>}
          </div>
        );
      })}
    </div>
  );
}