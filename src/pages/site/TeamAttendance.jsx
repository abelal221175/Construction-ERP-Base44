import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Users, Save, CheckCircle2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const todayStr = () => new Date().toISOString().slice(0, 10);

const STATUS_LIST = [
  { key: 'Present', labelAr: 'حضور', labelEn: 'Pres' },
  { key: 'Late', labelAr: 'تأخير', labelEn: 'Late' },
  { key: 'Half-Day', labelAr: 'نصف', labelEn: 'Half' },
  { key: 'Absent', labelAr: 'غياب', labelEn: 'Abs' },
  { key: 'On-Leave', labelAr: 'إجازة', labelEn: 'Leave' },
];

const STATUS_CLS = {
  Present: { on: 'bg-emerald-500 text-white', off: 'bg-emerald-50 text-emerald-600' },
  Late: { on: 'bg-amber-500 text-white', off: 'bg-amber-50 text-amber-600' },
  'Half-Day': { on: 'bg-amber-500 text-white', off: 'bg-amber-50 text-amber-600' },
  Absent: { on: 'bg-red-500 text-white', off: 'bg-red-50 text-red-600' },
  'On-Leave': { on: 'bg-slate-500 text-white', off: 'bg-slate-100 text-slate-500' },
};

export default function TeamAttendance() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [statuses, setStatuses] = useState({});
  const [busy, setBusy] = useState(false);

  const cf = currentCompany ? { company_id: currentCompany.id } : {};
  const { data: projects = [] } = useQuery({
    queryKey: ['siteProjects', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.Project.filter(cf) : base44.entities.Project.list(),
    staleTime: 60_000,
  });
  const { data: employees = [] } = useQuery({
    queryKey: ['siteEmployees', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.Employee.filter(cf) : base44.entities.Employee.list(),
    staleTime: 60_000,
  });

  const team = useMemo(() => {
    let list = employees.filter((e) => e.is_active !== false);
    if (projectId) list = list.filter((e) => e.current_project_id === projectId);
    return list;
  }, [employees, projectId]);

  const { data: existing = [] } = useQuery({
    queryKey: ['siteTeamAttendance', projectId, date],
    queryFn: () => base44.entities.SiteAttendance.filter({ project_id: projectId, attendance_date: date }),
    enabled: !!projectId,
    staleTime: 15_000,
  });

  const existingMap = useMemo(() => {
    const m = {};
    existing.forEach((r) => { m[r.employee_id] = r; });
    return m;
  }, [existing]);

  useEffect(() => {
    const init = {};
    team.forEach((e) => { init[e.id] = existingMap[e.id]?.status || 'Present'; });
    setStatuses(init);
  }, [team, existingMap]);

  const setStatus = (empId, status) => setStatuses((s) => ({ ...s, [empId]: status }));

  const counts = useMemo(() => {
    const c = { Present: 0, Late: 0, 'Half-Day': 0, Absent: 0, 'On-Leave': 0 };
    team.forEach((e) => { const st = statuses[e.id]; if (st && c[st] != null) c[st]++; });
    return c;
  }, [team, statuses]);

  const handleSave = async () => {
    if (!projectId) { toast.error(language === 'ar' ? 'اختر المشروع' : 'Select project'); return; }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const toCreate = [];
      const toUpdate = [];
      team.forEach((e) => {
        const st = statuses[e.id] || 'Present';
        const ex = existingMap[e.id];
        const needsCheckIn = ['Present', 'Late', 'Half-Day'].includes(st);
        if (ex) {
          if (ex.status !== st) toUpdate.push({ id: ex.id, status: st });
        } else {
          toCreate.push({
            company_id: currentCompany?.id,
            employee_id: e.id,
            employee_name: language === 'ar' ? e.employee_name_ar : e.employee_name_en,
            project_id: projectId,
            attendance_date: date,
            status: st,
            check_in_time: needsCheckIn ? now : null,
          });
        }
      });
      if (toCreate.length) await base44.entities.SiteAttendance.bulkCreate(toCreate);
      if (toUpdate.length) await base44.entities.SiteAttendance.bulkUpdate(toUpdate);
      qc.invalidateQueries({ queryKey: ['siteTeamAttendance'] });
      qc.invalidateQueries({ queryKey: ['siteAttendanceToday'] });
      qc.invalidateQueries({ queryKey: ['siteAttendanceHistory'] });
      qc.invalidateQueries({ queryKey: ['siteAttendanceTodayHome'] });
      toast.success(language === 'ar' ? `تم حفظ حضور ${team.length} موظف` : `Saved ${team.length} entries`);
    } catch (e) {
      toast.error(e.message || (language === 'ar' ? 'خطأ' : 'Error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/site/attendance')}>
          <ChevronLeft className={cn('h-5 w-5', isRTL && 'rotate-180')} />
        </Button>
        <h1 className="font-display text-[16px] font-semibold text-slate-800 flex-1 flex items-center gap-1.5">
          <Users className="h-4 w-4 text-erp-accent" />
          {language === 'ar' ? 'حضور الفريق' : 'Team Attendance'}
        </h1>
      </div>

      <Card className="p-3 border-erp-border mb-3 space-y-2">
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-full h-10 text-[13px]">
            <SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select project'} />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{language === 'ar' ? p.project_name_ar : p.project_name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 text-[13px]" />
      </Card>

      {team.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {STATUS_LIST.map((s) => (
            <span key={s.key} className={cn('text-[11px] px-2 py-1 rounded-full font-medium', STATUS_CLS[s.key].off)}>
              {language === 'ar' ? s.labelAr : s.labelEn}: {counts[s.key] || 0}
            </span>
          ))}
        </div>
      )}

      {!projectId ? (
        <Card className="p-8 text-center text-[12px] text-slate-400 border-erp-border">
          {language === 'ar' ? 'اختر مشروع لعرض الفريق' : 'Select a project to load the team'}
        </Card>
      ) : team.length === 0 ? (
        <Card className="p-8 text-center text-[12px] text-slate-400 border-erp-border">
          {language === 'ar' ? 'لا يوجد موظفين لهذا المشروع' : 'No employees assigned to this project'}
        </Card>
      ) : (
        <div className="space-y-2 mb-4">
          {team.map((e) => {
            const st = statuses[e.id] || 'Present';
            const recorded = !!existingMap[e.id];
            return (
              <Card key={e.id} className="p-2.5 border-erp-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-slate-700 truncate">{language === 'ar' ? e.employee_name_ar : e.employee_name_en}</div>
                    <div className="text-[10px] text-slate-400 truncate">{e.employee_code}{e.job_title_en ? ` · ${language === 'ar' ? e.job_title_ar : e.job_title_en}` : ''}</div>
                  </div>
                  {recorded && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                </div>
                <div className="flex gap-1">
                  {STATUS_LIST.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setStatus(e.id, s.key)}
                      className={cn(
                        'flex-1 h-7 rounded-md text-[11px] font-medium transition-colors',
                        st === s.key ? STATUS_CLS[s.key].on : STATUS_CLS[s.key].off
                      )}
                    >
                      {language === 'ar' ? s.labelAr : s.labelEn}
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {team.length > 0 && (
        <Button onClick={handleSave} disabled={busy} className="w-full h-12 gap-1.5 text-[14px]">
          <Save className="h-4 w-4" />
          {busy ? '...' : (language === 'ar' ? 'حفظ الحضور' : 'Save Attendance')}
        </Button>
      )}
    </div>
  );
}