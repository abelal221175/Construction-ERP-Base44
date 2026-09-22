import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatCurrency, formatDate } from '@/components/shared/formatters';
import { getStatusColor } from '@/components/shared/formatters';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, CheckCircle2, Clock, Bell, Activity, ShoppingCart,
  FileText, Shield
} from 'lucide-react';

export default function AlertsAndActivity({ lgs, pos, ipcs, projects, language, isRTL }) {
  const today = new Date();
  const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiringLGsList = lgs.filter(lg => {
    if (lg.status !== 'active') return false;
    const expiry = new Date(lg.expiry_date);
    return expiry <= thirtyDaysLater;
  });

  const alerts = [
    ...expiringLGsList.map(lg => ({
      type: 'warning',
      icon: Shield,
      title: `LG: ${lg.lg_number}`,
      sub: `${language === 'ar' ? 'ينتهي' : 'Expires'} ${formatDate(lg.expiry_date)}`,
      href: createPageUrl('LettersOfGuarantee'),
    })),
    ...ipcs.filter(i => i.status !== 'paid' && (i.net_payable_amount || 0) > 0).slice(0, 3).map(ipc => ({
      type: 'info',
      icon: FileText,
      title: `IPC: ${ipc.ipc_number || ipc.id?.slice(-6)}`,
      sub: `${formatCurrency(ipc.net_payable_amount, 'EGP', 0)} ${language === 'ar' ? 'غير مدفوع' : 'unpaid'}`,
      href: createPageUrl('ClientIPC'),
    })),
    ...pos.filter(p => p.status === 'draft').slice(0, 2).map(po => ({
      type: 'neutral',
      icon: ShoppingCart,
      title: `PO: ${po.po_number || po.id?.slice(-6)}`,
      sub: `${language === 'ar' ? 'في انتظار الاعتماد' : 'Awaiting Approval'} · ${formatCurrency(po.total_amount, 'EGP', 0)}`,
      href: createPageUrl('PurchaseOrders'),
    })),
  ].slice(0, 8);

  // Recent activity from projects
  const recentProjects = [...projects].sort((a, b) =>
    new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date)
  ).slice(0, 5);

  const alertTypeStyles = {
    warning: 'bg-red-50 border-red-100 text-red-700',
    info: 'bg-amber-50 border-amber-100 text-amber-700',
    neutral: 'bg-slate-50 border-slate-100 text-slate-700',
  };
  const alertIconStyles = {
    warning: 'text-red-500',
    info: 'text-amber-500',
    neutral: 'text-slate-400',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Alerts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-red-500" />
            {language === 'ar' ? 'التنبيهات والإشعارات' : 'Alerts & Notifications'}
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-auto text-xs">{alerts.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <Link key={i} to={alert.href}>
                  <div className={cn(
                    "flex items-center gap-3 p-2 rounded-lg border transition-all hover:opacity-80",
                    alertTypeStyles[alert.type]
                  )}>
                    <alert.icon className={cn("h-4 w-4 flex-shrink-0", alertIconStyles[alert.type])} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{alert.title}</p>
                      <p className="text-xs opacity-80 truncate">{alert.sub}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2" />
              <p className="text-sm text-slate-500">
                {language === 'ar' ? 'لا توجد تنبيهات حالية' : 'No active alerts'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Projects Activity */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-blue-600" />
              {language === 'ar' ? 'آخر نشاط المشروعات' : 'Recent Project Activity'}
            </CardTitle>
            <Link to={createPageUrl('Projects')} className="text-xs text-blue-600 hover:underline">
              {language === 'ar' ? 'عرض الكل' : 'View All'}
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-700">
                      {(project.project_code || '??').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {language === 'ar' ? project.project_name_ar : project.project_name_en}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(project.updated_date || project.created_date)}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-xs flex-shrink-0", getStatusColor(project.status))}>
                  {project.status}
                </Badge>
              </div>
            ))}
            {recentProjects.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                {language === 'ar' ? 'لا توجد مشروعات' : 'No projects yet'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}