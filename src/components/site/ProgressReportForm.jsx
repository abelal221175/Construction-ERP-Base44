import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';

const WEATHER = ['sunny', 'cloudy', 'rainy', 'windy', 'foggy'];

export default function ProgressReportForm({ open, onClose, projects, user }) {
  const { language } = useLanguage();
  const { currentCompany } = useCompany();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    project_id: '', work_summary: '', progress_percentage: 0, manpower_count: 0,
    weather: 'sunny', equipment_summary: '', issues_delays: '', notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.project_id) { setError(language === 'ar' ? 'اختر المشروع' : 'Select project'); return; }
    if (!form.work_summary.trim()) { setError(language === 'ar' ? 'أدخل ملخص العمل' : 'Enter work summary'); return; }
    setBusy(true);
    try {
      await base44.entities.SiteProgressReport.create({
        company_id: currentCompany?.id,
        report_date: new Date().toISOString().slice(0, 10),
        reported_by: user?.id,
        reported_by_name: user?.full_name,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        ...form,
        progress_percentage: Number(form.progress_percentage) || 0,
        manpower_count: Number(form.manpower_count) || 0,
      });
      qc.invalidateQueries({ queryKey: ['siteProgressReports'] });
      setForm({ project_id: '', work_summary: '', progress_percentage: 0, manpower_count: 0, weather: 'sunny', equipment_summary: '', issues_delays: '', notes: '' });
      onClose();
    } catch (e) {
      setError(e.message || (language === 'ar' ? 'خطأ' : 'Error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] flex flex-col p-0 rounded-t-2xl">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle className="text-[15px]">{language === 'ar' ? 'تقرير تقدم جديد' : 'New Progress Report'}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div>
            <Label className="text-[12px] mb-1">{language === 'ar' ? 'المشروع' : 'Project'}</Label>
            <Select value={form.project_id} onValueChange={(v) => set('project_id', v)}>
              <SelectTrigger className="h-10 text-[13px]"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{language === 'ar' ? p.project_name_ar : p.project_name_en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px] mb-1">{language === 'ar' ? 'ملخص العمل' : 'Work Summary'}</Label>
            <Textarea value={form.work_summary} onChange={(e) => set('work_summary', e.target.value)} rows={3} className="text-[13px]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[12px] mb-1">{language === 'ar' ? 'نسبة الإنجاز %' : 'Progress %'}</Label>
              <Input type="number" min={0} max={100} value={form.progress_percentage} onChange={(e) => set('progress_percentage', e.target.value)} className="h-10 text-[13px]" />
            </div>
            <div>
              <Label className="text-[12px] mb-1">{language === 'ar' ? 'العمالة' : 'Manpower'}</Label>
              <Input type="number" min={0} value={form.manpower_count} onChange={(e) => set('manpower_count', e.target.value)} className="h-10 text-[13px]" />
            </div>
          </div>
          <div>
            <Label className="text-[12px] mb-1">{language === 'ar' ? 'الطقس' : 'Weather'}</Label>
            <Select value={form.weather} onValueChange={(v) => set('weather', v)}>
              <SelectTrigger className="h-10 text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WEATHER.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px] mb-1">{language === 'ar' ? 'المعدات المستخدمة' : 'Equipment Used'}</Label>
            <Textarea value={form.equipment_summary} onChange={(e) => set('equipment_summary', e.target.value)} rows={2} className="text-[13px]" />
          </div>
          <div>
            <Label className="text-[12px] mb-1">{language === 'ar' ? 'المشكلات/التأخيرات' : 'Issues / Delays'}</Label>
            <Textarea value={form.issues_delays} onChange={(e) => set('issues_delays', e.target.value)} rows={2} className="text-[13px]" />
          </div>
          <div>
            <Label className="text-[12px] mb-1">{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} className="h-10 text-[13px]" />
          </div>
          {error && <p className="text-[11px] text-red-500">{error}</p>}
        </div>
        <SheetFooter className="px-4 py-3 border-t">
          <Button onClick={submit} disabled={busy} className="w-full h-11 text-[13px]">
            {busy ? '...' : (language === 'ar' ? 'إرسال التقرير' : 'Submit Report')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}