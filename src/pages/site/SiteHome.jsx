import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, FileCheck, AlertCircle, ChevronLeft, Plus, ClipboardCheck, Calendar, UserCheck, TrendingUp } from 'lucide-react';
import IRStatusBadge, { IR_STATUS_MAP } from '@/components/site/IRStatusBadge';
import { formatDate } from '@/components/shared/formatters';
import { cn } from '@/lib/utils';

export default function SiteHome() {
  const { language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const cf = currentCompany ? { company_id: currentCompany.id } : {};

  const { data: irs = [] } = useQuery({
    queryKey: ['siteIRs', currentCompany?.id],
    queryFn: () =>
      currentCompany ? base44.entities.ClientInspectionRequest.filter(cf) : base44.entities.ClientInspectionRequest.list(),
    staleTime: 30_000,
  });

  const { data: todayAtt = [] } = useQuery({
    queryKey: ['siteAttendanceTodayHome', currentCompany?.id],
    queryFn: () =>
      currentCompany
        ? base44.entities.SiteAttendance.filter({ company_id: currentCompany.id, attendance_date: new Date().toISOString().slice(0, 10) })
        : base44.entities.SiteAttendance.filter({ attendance_date: new Date().toISOString().slice(0, 10) }),
    staleTime: 30_000,
  });

  const pending = irs.filter((i) => ['Draft', 'Submitted-to-Consultant', 'Under-Review', 'Revision-Required'].includes(i.status));
  const approved = irs.filter((i) => i.status === 'Approved' && !i.linked_to_ipc_id);
  const recent = [...irs].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);

  const stats = [
    { icon: Clock, labelAr: 'حضور اليوم', labelEn: "Today's Attendance", value: todayAtt.length, color: 'text-erp-emerald', bg: 'bg-emerald-50' },
    { icon: AlertCircle, labelAr: 'مهام معلقة', labelEn: 'Pending Tasks', value: pending.length, color: 'text-erp-ruby', bg: 'bg-red-50' },
    { icon: ClipboardCheck, labelAr: 'طلبات معاينة', labelEn: 'Inspection Requests', value: irs.length, color: 'text-erp-accent', bg: 'bg-blue-50' },
    { icon: FileCheck, labelAr: 'جاهزة للمستخلص', labelEn: 'Ready for IPC', value: approved.length, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-[18px] font-semibold text-slate-800">
            {language === 'ar' ? 'بوابة الموقع' : 'Site Portal'}
          </h1>
          <p className="text-[12px] text-slate-500">
            {new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="h-9 w-9 rounded-full bg-erp-accent text-white flex items-center justify-center text-[12px] font-mono font-semibold">
          {currentCompany?.company_name_en?.charAt(0) || 'S'}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {stats.map((s, i) => (
          <Card key={i} className="p-3 flex items-center gap-3 border-erp-border">
            <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', s.bg)}>
              <s.icon className={cn('h-5 w-5', s.color)} />
            </div>
            <div>
              <div className="font-mono text-[18px] font-semibold text-slate-800 leading-none">{s.value}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{language === 'ar' ? s.labelAr : s.labelEn}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <Link to="/site/ir/new">
          <Button className="w-full h-11 gap-1.5 text-[13px]">
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'طلب معاينة جديد' : 'New Inspection Req'}
          </Button>
        </Link>
        <Link to="/site/ir">
          <Button variant="outline" className="w-full h-11 gap-1.5 text-[13px]">
            <ClipboardCheck className="h-4 w-4" />
            {language === 'ar' ? 'كل الطلبات' : 'All Requests'}
          </Button>
        </Link>
        <Link to="/site/attendance">
          <Button variant="outline" className="w-full h-11 gap-1.5 text-[13px]">
            <UserCheck className="h-4 w-4" />
            {language === 'ar' ? 'تسجيل الحضور' : 'Check In'}
          </Button>
        </Link>
        <Link to="/site/progress">
          <Button variant="outline" className="w-full h-11 gap-1.5 text-[13px]">
            <TrendingUp className="h-4 w-4" />
            {language === 'ar' ? 'تقرير التقدم' : 'Progress Report'}
          </Button>
        </Link>
      </div>

      {/* Recent activity */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-slate-700">
          {language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}
        </h2>
        <Link to="/site/ir" className="text-[11px] text-erp-accent flex items-center gap-0.5">
          {language === 'ar' ? 'الكل' : 'View all'}
          <ChevronLeft className={cn('h-3 w-3', isRTL && 'rotate-180')} />
        </Link>
      </div>

      <div className="space-y-2">
        {recent.length === 0 ? (
          <Card className="p-6 text-center text-[12px] text-slate-400 border-erp-border">
            {language === 'ar' ? 'لا توجد طلبات معاينة بعد' : 'No inspection requests yet'}
          </Card>
        ) : (
          recent.map((ir) => (
            <Link key={ir.id} to={`/site/ir/${ir.id}`}>
              <Card className="p-3 flex items-center justify-between border-erp-border hover:border-erp-accent transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] font-semibold text-slate-700">{ir.ir_number}</span>
                    <IRStatusBadge status={ir.status} language={language} />
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                    <Calendar className="h-3 w-3" />
                    {formatDate(ir.ir_date)}
                    {ir.ipc_period ? ` · IPC ${ir.ipc_period}` : ''}
                  </div>
                </div>
                <ChevronLeft className={cn('h-4 w-4 text-slate-300 shrink-0', isRTL && 'rotate-180')} />
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}