import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Users, CloudSun, AlertTriangle, BarChart3 } from 'lucide-react';
import { formatDate } from '@/components/shared/formatters';
import ProgressReportForm from '@/components/site/ProgressReportForm';

export default function SiteProgress() {
  const { language } = useLanguage();
  const { currentCompany } = useCompany();
  const [user, setUser] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const cf = currentCompany ? { company_id: currentCompany.id } : {};
  const { data: projects = [] } = useQuery({
    queryKey: ['siteProjects', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.Project.filter(cf) : base44.entities.Project.list(),
    staleTime: 60_000,
  });
  const { data: reports = [] } = useQuery({
    queryKey: ['siteProgressReports', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.SiteProgressReport.filter(cf) : base44.entities.SiteProgressReport.list(),
    staleTime: 30_000,
  });

  const sorted = [...reports].sort((a, b) => new Date(b.report_date) - new Date(a.report_date));
  const projName = (id) => {
    const p = projects.find((x) => x.id === id);
    return p ? (language === 'ar' ? p.project_name_ar : p.project_name_en) : '—';
  };

  return (
    <div className="p-4">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-[18px] font-semibold text-slate-800">
            {language === 'ar' ? 'تقدم الموقع' : 'Site Progress'}
          </h1>
          <p className="text-[12px] text-slate-500">{reports.length} {language === 'ar' ? 'تقرير' : 'reports'}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link to="/site/production">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-[13px]">
              <BarChart3 className="h-4 w-4" />
              {language === 'ar' ? 'الإنتاج' : 'Production'}
            </Button>
          </Link>
          <Button onClick={() => setFormOpen(true)} className="h-9 gap-1.5 text-[13px]">
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'جديد' : 'New'}
          </Button>
        </div>
      </header>

      <div className="space-y-2.5">
        {sorted.length === 0 ? (
          <Card className="p-8 text-center text-[12px] text-slate-400 border-erp-border">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            {language === 'ar' ? 'لا توجد تقارير تقدم بعد' : 'No progress reports yet'}
          </Card>
        ) : sorted.map((r) => (
          <Link key={r.id} to={`/site/progress/${r.id}`}>
          <Card className="p-3.5 border-erp-border hover:border-erp-accent transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-semibold text-slate-700">{projName(r.project_id)}</span>
              <span className="text-[11px] text-slate-400">{formatDate(r.report_date)}</span>
            </div>
            <p className="text-[12px] text-slate-600 leading-snug mb-2">{r.work_summary}</p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              {r.progress_percentage != null && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-erp-accent" />
                  {r.progress_percentage}%
                </span>
              )}
              {r.manpower_count > 0 && (
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{r.manpower_count}</span>
              )}
              {r.weather && <span className="flex items-center gap-1"><CloudSun className="h-3 w-3" />{r.weather}</span>}
              {r.safety_incidents > 0 && (
                <span className="flex items-center gap-1 text-erp-ruby"><AlertTriangle className="h-3 w-3" />{r.safety_incidents}</span>
              )}
            </div>
            {r.issues_delays && (
              <p className="text-[11px] text-amber-600 mt-1.5 line-clamp-2">{r.issues_delays}</p>
            )}
            {r.reported_by_name && <p className="text-[10px] text-slate-400 mt-1.5">— {r.reported_by_name}</p>}
          </Card>
          </Link>
        ))}
      </div>

      <ProgressReportForm open={formOpen} onClose={() => setFormOpen(false)} projects={projects} user={user} />
    </div>
  );
}