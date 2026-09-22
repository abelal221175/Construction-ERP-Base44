import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Calendar, User, Users, CloudSun, TrendingUp, AlertTriangle, Wrench, Camera, Clock, Check } from 'lucide-react';
import { formatDate, formatDateTime, formatNumber } from '@/components/shared/formatters';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-50 text-blue-600',
  approved: 'bg-emerald-50 text-emerald-600',
  rejected: 'bg-red-50 text-red-600',
};

export default function SiteProgressDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();

  const { data: report, isLoading } = useQuery({
    queryKey: ['siteProgressReport', id],
    queryFn: () => base44.entities.SiteProgressReport.get(id),
    enabled: !!id,
    staleTime: 30_000,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['siteProjects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 120_000,
  });
  const project = projects.find((p) => p.id === report?.project_id);

  if (isLoading) {
    return <div className="p-8 text-center text-[12px] text-slate-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>;
  }
  if (!report) {
    return <div className="p-8 text-center text-[12px] text-slate-400">{language === 'ar' ? 'غير موجود' : 'Not found'}</div>;
  }

  const photos = (() => { try { return JSON.parse(report.photos || '[]'); } catch { return []; } })();
  const projName = project ? (language === 'ar' ? project.project_name_ar : project.project_name_en) : '—';

  const timeline = [
    { icon: Clock, labelAr: 'تاريخ التقرير', labelEn: 'Report Date', value: formatDate(report.report_date), done: true },
    { icon: Check, labelAr: 'تم الإرسال', labelEn: 'Submitted', value: report.submitted_at ? formatDateTime(report.submitted_at) : '—', done: !!report.submitted_at },
    { icon: Check, labelAr: 'معتمد', labelEn: 'Approved', value: report.approved_at ? formatDateTime(report.approved_at) : '—', done: !!report.approved_at },
  ];

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ChevronLeft className={cn('h-5 w-5', isRTL && 'rotate-180')} />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-slate-800 truncate">{projName}</div>
          <span className={cn('inline-block text-[11px] px-2 py-0.5 rounded-full mt-0.5', STATUS_STYLES[report.status] || 'bg-slate-100 text-slate-600')}>
            {report.status}
          </span>
        </div>
      </div>

      <Card className="p-3 border-erp-border mb-3">
        <div className="space-y-1.5 text-[12px]">
          <div className="flex items-center gap-2 text-slate-600"><Calendar className="h-3.5 w-3.5 text-slate-400" /><span>{formatDate(report.report_date)}</span></div>
          {report.reported_by_name && <div className="flex items-center gap-2 text-slate-600"><User className="h-3.5 w-3.5 text-slate-400" /><span>{report.reported_by_name}</span></div>}
          {report.shift && <div className="flex items-center gap-2 text-slate-600"><Clock className="h-3.5 w-3.5 text-slate-400" /><span>{report.shift}</span></div>}
          {report.weather && <div className="flex items-center gap-2 text-slate-600"><CloudSun className="h-3.5 w-3.5 text-slate-400" /><span>{report.weather}{report.temperature != null ? ` · ${report.temperature}°` : ''}</span></div>}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <Card className="p-3 border-erp-border flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-erp-accent" /></div>
          <div><div className="font-mono text-[16px] font-semibold text-slate-800">{formatNumber(report.progress_percentage || 0, 0)}%</div><div className="text-[10px] text-slate-500">{language === 'ar' ? 'الإنجاز' : 'Progress'}</div></div>
        </Card>
        <Card className="p-3 border-erp-border flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center"><Users className="h-4 w-4 text-erp-emerald" /></div>
          <div><div className="font-mono text-[16px] font-semibold text-slate-800">{report.manpower_count || 0}</div><div className="text-[10px] text-slate-500">{language === 'ar' ? 'العمالة' : 'Manpower'}</div></div>
        </Card>
      </div>

      <Card className="p-3 border-erp-border mb-3">
        <div className="text-[12px] font-semibold text-slate-700 mb-2">{language === 'ar' ? 'المراحل' : 'Timeline'}</div>
        <div className="space-y-2">
          {timeline.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <div className={cn('h-6 w-6 rounded-full flex items-center justify-center', t.done ? 'bg-emerald-100 text-erp-emerald' : 'bg-slate-100 text-slate-300')}>
                <t.icon className="h-3 w-3" />
              </div>
              <span className="text-slate-500">{language === 'ar' ? t.labelAr : t.labelEn}</span>
              <span className="text-slate-400 mr-auto">{t.value}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="text-[13px] font-semibold text-slate-700 mb-2">{language === 'ar' ? 'ملخص العمل' : 'Work Summary'}</div>
      <Card className="p-3 border-erp-border mb-3">
        <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">{report.work_summary}</p>
      </Card>

      {report.equipment_summary && (
        <>
          <div className="text-[13px] font-semibold text-slate-700 mb-2">{language === 'ar' ? 'المعدات' : 'Equipment'}</div>
          <Card className="p-3 border-erp-border mb-3 flex items-start gap-2">
            <Wrench className="h-4 w-4 text-slate-400 mt-0.5" />
            <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">{report.equipment_summary}</p>
          </Card>
        </>
      )}

      {report.issues_delays && (
        <>
          <div className="text-[13px] font-semibold text-slate-700 mb-2">{language === 'ar' ? 'المشكلات/التأخيرات' : 'Issues / Delays'}</div>
          <Card className="p-3 border-amber-200 bg-amber-50/40 mb-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
            <p className="text-[12px] text-amber-700 leading-relaxed whitespace-pre-wrap">{report.issues_delays}</p>
          </Card>
        </>
      )}

      {photos.length > 0 && (
        <>
          <div className="text-[13px] font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><Camera className="h-4 w-4 text-slate-400" />{language === 'ar' ? 'الصور' : 'Photos'}</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover border border-erp-border" />
              </a>
            ))}
          </div>
        </>
      )}

      {report.notes && (
        <Card className="p-3 border-erp-border">
          <div className="text-[11px] text-slate-400 mb-1">{language === 'ar' ? 'ملاحظات' : 'Notes'}</div>
          <div className="text-[12px] text-slate-600">{report.notes}</div>
        </Card>
      )}
    </div>
  );
}