import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Calendar, LogIn, LogOut, MapPin, Camera, Clock, User } from 'lucide-react';
import { formatDate, formatDateTime, formatNumber } from '@/components/shared/formatters';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  Present: 'bg-emerald-50 text-emerald-600',
  Absent: 'bg-red-50 text-red-600',
  Late: 'bg-amber-50 text-amber-600',
  'Half-Day': 'bg-amber-50 text-amber-600',
  'On-Leave': 'bg-slate-100 text-slate-600',
};

export default function SiteAttendanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();

  const { data: att, isLoading } = useQuery({
    queryKey: ['siteAttendance', id],
    queryFn: () => base44.entities.SiteAttendance.get(id),
    enabled: !!id,
    staleTime: 30_000,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['siteProjects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 120_000,
  });
  const project = projects.find((p) => p.id === att?.project_id);

  if (isLoading) return <div className="p-8 text-center text-[12px] text-slate-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>;
  if (!att) return <div className="p-8 text-center text-[12px] text-slate-400">{language === 'ar' ? 'غير موجود' : 'Not found'}</div>;

  const projName = project ? (language === 'ar' ? project.project_name_ar : project.project_name_en) : '—';

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ChevronLeft className={cn('h-5 w-5', isRTL && 'rotate-180')} />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-slate-800">{att.employee_name || '—'}</div>
          <span className={cn('inline-block text-[11px] px-2 py-0.5 rounded-full mt-0.5', STATUS_STYLES[att.status] || 'bg-slate-100 text-slate-600')}>
            {att.status}
          </span>
        </div>
      </div>

      <Card className="p-3 border-erp-border mb-3">
        <div className="space-y-1.5 text-[12px]">
          <div className="flex items-center gap-2 text-slate-600"><Calendar className="h-3.5 w-3.5 text-slate-400" /><span>{formatDate(att.attendance_date)}</span></div>
          <div className="flex items-center gap-2 text-slate-600"><User className="h-3.5 w-3.5 text-slate-400" /><span>{projName}</span></div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <Card className="p-3 border-erp-border">
          <div className="flex items-center gap-1.5 text-emerald-600 mb-1"><LogIn className="h-3.5 w-3.5" /><span className="text-[11px] font-medium">{language === 'ar' ? 'الحضور' : 'Check In'}</span></div>
          <div className="text-[12px] text-slate-700 font-mono">{att.check_in_time ? formatDateTime(att.check_in_time) : '—'}</div>
        </Card>
        <Card className="p-3 border-erp-border">
          <div className="flex items-center gap-1.5 text-red-500 mb-1"><LogOut className="h-3.5 w-3.5" /><span className="text-[11px] font-medium">{language === 'ar' ? 'الانصراف' : 'Check Out'}</span></div>
          <div className="text-[12px] text-slate-700 font-mono">{att.check_out_time ? formatDateTime(att.check_out_time) : '—'}</div>
        </Card>
      </div>

      {att.work_hours != null && (
        <Card className="p-3 border-erp-border mb-3 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center"><Clock className="h-4 w-4 text-erp-accent" /></div>
          <div><div className="font-mono text-[16px] font-semibold text-slate-800">{formatNumber(att.work_hours, 1)}h</div><div className="text-[10px] text-slate-500">{language === 'ar' ? 'ساعات العمل' : 'Work Hours'}</div></div>
          {att.overtime_hours > 0 && <div className="mr-auto text-right"><div className="font-mono text-[14px] text-amber-600">{formatNumber(att.overtime_hours, 1)}h</div><div className="text-[10px] text-slate-500">{language === 'ar' ? 'إضافي' : 'Overtime'}</div></div>}
        </Card>
      )}

      {att.check_in_latitude != null && (
        <Card className="p-3 border-erp-border mb-3">
          <div className="text-[11px] text-slate-400 mb-1">{language === 'ar' ? 'الموقع' : 'Location'}</div>
          <div className="flex items-center gap-2 text-[12px] text-slate-600"><MapPin className="h-3.5 w-3.5 text-erp-accent" /><span>{Number(att.check_in_latitude).toFixed(5)}, {Number(att.check_in_longitude).toFixed(5)}</span></div>
          {att.check_in_location_name && <div className="text-[11px] text-slate-500 mt-1">{att.check_in_location_name}</div>}
        </Card>
      )}

      {(att.check_in_photo_url || att.check_out_photo_url) && (
        <>
          <div className="text-[13px] font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><Camera className="h-4 w-4 text-slate-400" />{language === 'ar' ? 'الصور' : 'Photos'}</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {att.check_in_photo_url && <a href={att.check_in_photo_url} target="_blank" rel="noreferrer"><img src={att.check_in_photo_url} alt="" className="h-20 w-20 rounded-lg object-cover border border-erp-border" /></a>}
            {att.check_out_photo_url && <a href={att.check_out_photo_url} target="_blank" rel="noreferrer"><img src={att.check_out_photo_url} alt="" className="h-20 w-20 rounded-lg object-cover border border-erp-border" /></a>}
          </div>
        </>
      )}

      {att.notes && (
        <Card className="p-3 border-erp-border">
          <div className="text-[11px] text-slate-400 mb-1">{language === 'ar' ? 'ملاحظات' : 'Notes'}</div>
          <div className="text-[12px] text-slate-600">{att.notes}</div>
        </Card>
      )}
    </div>
  );
}