import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, LogIn, LogOut, MapPin, Camera, Clock, CheckCircle2, Users } from 'lucide-react';
import { formatDate, formatDateTime } from '@/components/shared/formatters';
import { cn } from '@/lib/utils';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function SiteAttendance() {
  const { language } = useLanguage();
  const { currentCompany } = useCompany();
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const cf = currentCompany ? { company_id: currentCompany.id } : {};
  const { data: projects = [] } = useQuery({
    queryKey: ['siteProjects', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.Project.filter(cf) : base44.entities.Project.list(),
    staleTime: 60_000,
  });

  const { data: todayRec, isLoading } = useQuery({
    queryKey: ['siteAttendanceToday', user?.id, todayStr()],
    enabled: !!user,
    queryFn: () => base44.entities.SiteAttendance.filter({ employee_id: user.id, attendance_date: todayStr() }),
    staleTime: 15_000,
  });
  const today = todayRec?.[0];

  const { data: history = [] } = useQuery({
    queryKey: ['siteAttendanceHistory', user?.id],
    enabled: !!user,
    queryFn: () => base44.entities.SiteAttendance.filter({ employee_id: user.id }, '-attendance_date', 20),
    staleTime: 30_000,
  });

  const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error(language === 'ar' ? 'المتصفح لا يدعم تحديد الموقع' : 'Geolocation unsupported'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  const handleCheckIn = async () => {
    setError('');
    if (!selectedProject) { setError(language === 'ar' ? 'اختر المشروع' : 'Select a project'); return; }
    setBusy(true);
    try {
      const c = await getLocation().catch(() => null);
      await base44.entities.SiteAttendance.create({
        company_id: currentCompany?.id,
        employee_id: user.id,
        employee_name: user.full_name,
        project_id: selectedProject,
        attendance_date: todayStr(),
        check_in_time: new Date().toISOString(),
        check_in_latitude: c?.lat,
        check_in_longitude: c?.lng,
        check_in_photo_url: photoUrl,
        status: 'Present',
      });
      setPhotoUrl(null);
      qc.invalidateQueries({ queryKey: ['siteAttendanceToday'] });
      qc.invalidateQueries({ queryKey: ['siteAttendanceHistory'] });
      qc.invalidateQueries({ queryKey: ['siteAttendanceTodayHome'] });
    } catch (e) {
      setError(e.message || (language === 'ar' ? 'خطأ' : 'Error'));
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    if (!today) return;
    setBusy(true);
    setError('');
    try {
      const out = new Date();
      const inTime = new Date(today.check_in_time);
      const hours = Math.round(((out - inTime) / 36e5) * 10) / 10;
      await base44.entities.SiteAttendance.update(today.id, {
        check_out_time: out.toISOString(),
        work_hours: hours,
      });
      qc.invalidateQueries({ queryKey: ['siteAttendanceToday'] });
      qc.invalidateQueries({ queryKey: ['siteAttendanceHistory'] });
    } catch (e) {
      setError(e.message || (language === 'ar' ? 'خطأ' : 'Error'));
    } finally {
      setBusy(false);
    }
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setPhotoUrl(file_url);
    } catch (err) {
      setError(err.message || (language === 'ar' ? 'فشل الرفع' : 'Upload failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-[18px] font-semibold text-slate-800">
            {language === 'ar' ? 'الحضور' : 'Attendance'}
          </h1>
          <p className="text-[12px] text-slate-500">{formatDate(todayStr())}</p>
        </div>
        <Link to="/site/attendance/team">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]">
            <Users className="h-3.5 w-3.5" />
            {language === 'ar' ? 'الفريق' : 'Team'}
          </Button>
        </Link>
      </header>

      <Card className="p-4 mb-4 border-erp-border">
        {isLoading ? (
          <div className="text-center text-[12px] text-slate-400 py-4">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
        ) : today ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-[14px] font-semibold text-slate-700">
                {language === 'ar' ? 'تم تسجيل الحضور' : 'Checked In'}
              </span>
            </div>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex items-center gap-2 text-slate-600">
                <LogIn className="h-3.5 w-3.5 text-emerald-500" />
                <span>{language === 'ar' ? 'دخول:' : 'In:'} {formatDateTime(today.check_in_time)}</span>
              </div>
              {today.check_out_time && (
                <div className="flex items-center gap-2 text-slate-600">
                  <LogOut className="h-3.5 w-3.5 text-red-500" />
                  <span>{language === 'ar' ? 'خروج:' : 'Out:'} {formatDateTime(today.check_out_time)}</span>
                </div>
              )}
              {today.work_hours != null && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{language === 'ar' ? 'ساعات العمل:' : 'Hours:'} {today.work_hours}h</span>
                </div>
              )}
              {today.check_in_latitude != null && (
                <div className="flex items-center gap-2 text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{Number(today.check_in_latitude).toFixed(4)}, {Number(today.check_in_longitude).toFixed(4)}</span>
                </div>
              )}
            </div>
            {!today.check_out_time && (
              <Button onClick={handleCheckOut} disabled={busy} className="w-full mt-3 h-11 gap-1.5 text-[13px]">
                <LogOut className="h-4 w-4" />
                {busy ? '...' : (language === 'ar' ? 'تسجيل الخروج' : 'Check Out')}
              </Button>
            )}
          </div>
        ) : (
          <div>
            <p className="text-[12px] text-slate-500 mb-3">
              {language === 'ar' ? 'لم يتم تسجيل الحضور اليوم' : 'Not checked in yet today'}
            </p>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full h-10 text-[13px] mb-2">
                <SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select project'} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {language === 'ar' ? p.project_name_ar : p.project_name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center justify-center gap-1.5 h-10 border border-dashed border-slate-300 rounded-md text-[12px] text-slate-500 mb-2 cursor-pointer">
              <Camera className="h-4 w-4" />
              {photoUrl ? (language === 'ar' ? 'تم إضافة صورة' : 'Photo added') : (language === 'ar' ? 'إضافة صورة (اختياري)' : 'Add photo (optional)')}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
            <Button onClick={handleCheckIn} disabled={busy} className="w-full h-11 gap-1.5 text-[13px]">
              <UserCheck className="h-4 w-4" />
              {busy ? '...' : (language === 'ar' ? 'تسجيل الحضور' : 'Check In')}
            </Button>
          </div>
        )}
        {error && <p className="text-[11px] text-red-500 mt-2">{error}</p>}
      </Card>

      <h2 className="text-[13px] font-semibold text-slate-700 mb-2">
        {language === 'ar' ? 'سجل الحضور' : 'Attendance History'}
      </h2>
      <div className="space-y-2">
        {history.length === 0 ? (
          <Card className="p-6 text-center text-[12px] text-slate-400 border-erp-border">
            {language === 'ar' ? 'لا يوجد سجل' : 'No records'}
          </Card>
        ) : history.map((h) => (
          <Link key={h.id} to={`/site/attendance/${h.id}`}>
          <Card className="p-3 border-erp-border hover:border-erp-accent transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-slate-700">{formatDate(h.attendance_date)}</span>
              <span className={cn('text-[11px] px-2 py-0.5 rounded-full', h.status === 'Present' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                {h.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
              {h.check_in_time && <span className="flex items-center gap-1"><LogIn className="h-3 w-3" />{formatDateTime(h.check_in_time)}</span>}
              {h.check_out_time && <span className="flex items-center gap-1"><LogOut className="h-3 w-3" />{formatDateTime(h.check_out_time)}</span>}
            </div>
            {h.work_hours != null && <div className="text-[11px] text-slate-400 mt-0.5">{h.work_hours}h</div>}
          </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}