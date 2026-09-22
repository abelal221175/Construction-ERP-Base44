import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatCurrency, formatNumber } from '@/components/shared/formatters';
import { cn } from '@/lib/utils';
import {
  Briefcase, FileText, ShoppingCart, Receipt, Shield, TrendingUp, TrendingDown, Minus
} from 'lucide-react';

function KPICard({ title, value, sub, icon: Icon, colorClass, bgClass, borderClass, href, trend }) {
  const inner = (
    <Card className={cn("hover:shadow-md transition-all cursor-pointer border-t-4", borderClass)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 mb-1 truncate">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
            {trend !== undefined && (
              <div className={cn("flex items-center gap-1 mt-1 text-xs font-medium",
                trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-slate-400'
              )}>
                {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {Math.abs(trend)}%
              </div>
            )}
          </div>
          <div className={cn("p-2 rounded-lg flex-shrink-0", bgClass)}>
            <Icon className={cn("h-5 w-5", colorClass)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link to={href}>{inner}</Link> : inner;
}

export default function ExecutiveKPICards({
  projects, prs, pos, ipcs, lgs, language, isRTL
}) {
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const pendingPRs = prs.filter(p => ['pending', 'submitted'].includes(p.status)).length;
  const pendingPOs = pos.filter(p => ['draft', 'approved'].includes(p.status)).length;
  const unpaidIPCs = ipcs.filter(i => i.status !== 'paid').length;
  const unpaidIPCAmount = ipcs.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.net_payable_amount || 0), 0);
  const totalPOValue = pos.reduce((s, po) => s + (po.total_amount || 0), 0);
  const totalContractValue = projects.reduce((s, p) => s + (p.contract_value || 0), 0);

  const today = new Date();
  const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringLGs = lgs.filter(lg => {
    if (lg.status !== 'active') return false;
    const expiry = new Date(lg.expiry_date);
    return expiry <= thirtyDaysLater;
  }).length;

  const kpis = [
    {
      title: language === 'ar' ? 'المشروعات النشطة' : 'Active Projects',
      value: formatNumber(activeProjects, 0),
      sub: `${formatNumber(projects.length, 0)} ${language === 'ar' ? 'إجمالي' : 'total'} · ${formatCurrency(totalContractValue, 'EGP', 0)}`,
      icon: Briefcase,
      colorClass: 'text-blue-600', bgClass: 'bg-blue-50', borderClass: 'border-t-blue-500',
      href: createPageUrl('Projects'),
    },
    {
      title: language === 'ar' ? 'طلبات الشراء المعلقة' : 'Pending PRs',
      value: formatNumber(pendingPRs, 0),
      sub: `${formatNumber(prs.length, 0)} ${language === 'ar' ? 'إجمالي' : 'total'}`,
      icon: FileText,
      colorClass: 'text-orange-600', bgClass: 'bg-orange-50', borderClass: 'border-t-orange-500',
      href: createPageUrl('PurchaseRequisitions'),
    },
    {
      title: language === 'ar' ? 'أوامر الشراء المعلقة' : 'Pending POs',
      value: formatNumber(pendingPOs, 0),
      sub: formatCurrency(totalPOValue, 'EGP', 0),
      icon: ShoppingCart,
      colorClass: 'text-purple-600', bgClass: 'bg-purple-50', borderClass: 'border-t-purple-500',
      href: createPageUrl('PurchaseOrders'),
    },
    {
      title: language === 'ar' ? 'مستخلصات غير مدفوعة' : 'Unpaid IPCs',
      value: formatNumber(unpaidIPCs, 0),
      sub: formatCurrency(unpaidIPCAmount, 'EGP', 0),
      icon: Receipt,
      colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50', borderClass: 'border-t-emerald-500',
      href: createPageUrl('ClientIPC'),
    },
    {
      title: language === 'ar' ? 'خطابات الضمان' : 'LGs Expiring',
      value: formatNumber(expiringLGs, 0),
      sub: language === 'ar' ? 'خلال 30 يوم' : 'Within 30 Days',
      icon: Shield,
      colorClass: expiringLGs > 0 ? 'text-red-600' : 'text-slate-500',
      bgClass: expiringLGs > 0 ? 'bg-red-50' : 'bg-slate-50',
      borderClass: expiringLGs > 0 ? 'border-t-red-500' : 'border-t-slate-300',
      href: createPageUrl('LettersOfGuarantee'),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpis.map((kpi, i) => <KPICard key={i} {...kpi} />)}
    </div>
  );
}