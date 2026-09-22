import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Search, Plus, Check, X } from 'lucide-react';
import QuantityEntryDialog from '@/components/site/QuantityEntryDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ClientIRCreate() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  const cf = currentCompany ? { company_id: currentCompany.id } : {};

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    project_id: '',
    ipc_period: '',
    inspection_date: '',
    inspection_location: '',
    consultant_representative: '',
    notes: '',
  });
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [dialogItem, setDialogItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Projects
  const { data: projects = [] } = useQuery({
    queryKey: ['siteProjects', currentCompany?.id],
    queryFn: () =>
      currentCompany ? base44.entities.Project.filter(cf) : base44.entities.Project.list(),
    staleTime: 60_000,
  });

  // BOQ for selected project
  const { data: boq = [], isLoading: boqLoading } = useQuery({
    queryKey: ['siteBOQ', form.project_id],
    enabled: !!form.project_id,
    queryFn: () => base44.entities.ProjectBOQ.filter({ project_id: form.project_id }),
    staleTime: 60_000,
  });

  // Previous cumulative from last approved IR items
  const { data: prevItems = [] } = useQuery({
    queryKey: ['prevIRItems', form.project_id],
    enabled: !!form.project_id,
    queryFn: async () => {
      const approvedIRs = await base44.entities.ClientInspectionRequest.filter({
        project_id: form.project_id,
        status: 'Approved',
      });
      if (approvedIRs.length === 0) return [];
      const allItems = [];
      for (const ir of approvedIRs) {
        const its = await base44.entities.ClientInspectionRequestItem.filter({ ir_id: ir.id });
        allItems.push(...its);
      }
      return allItems;
    },
    staleTime: 60_000,
  });

  const prevMap = useMemo(() => {
    const m = {};
    prevItems.forEach((it) => {
      const key = it.boq_item_id;
      if (!m[key] || (it.cumulative_quantity || 0) > (m[key].cumulative_quantity || 0)) {
        m[key] = it;
      }
    });
    return m;
  }, [prevItems]);

  const boqLineItems = useMemo(
    () => boq.filter((b) => b.level === 3 || (!b.level && b.quantity)),
    [boq]
  );

  const filteredBOQ = useMemo(() => {
    if (!search.trim()) return boqLineItems;
    const q = search.trim().toLowerCase();
    return boqLineItems.filter(
      (b) =>
        (b.system_code || '').toLowerCase().includes(q) ||
        (b.external_code || '').toLowerCase().includes(q) ||
        (b.item_description || '').toLowerCase().includes(q)
    );
  }, [boqLineItems, search]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const generateIRNumber = () => {
    const year = new Date().getFullYear();
    const rand = String(Math.floor(Math.random() * 90000) + 10000);
    return `CIR-${year}-${rand}`;
  };

  const addItem = (data) => {
    setItems((prev) => {
      const exists = prev.findIndex((p) => p.boq_item_id === data.boq_item_id);
      if (exists >= 0) {
        const copy = [...prev];
        copy[exists] = data;
        return copy;
      }
      return [...prev, data];
    });
    toast.success(language === 'ar' ? 'تمت إضافة البند' : 'Item added');
  };

  const removeItem = (boqItemId) =>
    setItems((prev) => prev.filter((p) => p.boq_item_id !== boqItemId));

  const canNext1 = form.project_id && form.ipc_period && form.inspection_date;
  const canSubmit = items.length > 0 && canNext1;

  const handleSubmit = async (submitStatus = 'Draft') => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const irNumber = generateIRNumber();
      const ir = await base44.entities.ClientInspectionRequest.create({
        ...cf,
        ir_number: irNumber,
        ir_date: new Date().toISOString().slice(0, 10),
        project_id: form.project_id,
        ipc_period: Number(form.ipc_period),
        inspection_date: form.inspection_date,
        inspection_location: form.inspection_location,
        consultant_representative: form.consultant_representative,
        status: submitStatus,
        submitted_at: submitStatus === 'Submitted-to-Consultant' ? new Date().toISOString() : null,
        total_items: items.length,
        notes: form.notes,
      });

      await base44.entities.ClientInspectionRequestItem.bulkCreate(
        items.map((it) => ({ ...it, ir_id: ir.id }))
      );

      queryClient.invalidateQueries({ queryKey: ['siteIRs'] });
      toast.success(language === 'ar' ? 'تم حفظ طلب المعاينة' : 'Inspection request saved');
      navigate(`/site/ir/${ir.id}`);
    } catch (e) {
      toast.error(language === 'ar' ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center gap-1.5 mb-4">
      {[1, 2, 3].map((n) => (
        <React.Fragment key={n}>
          <div className={cn(
            'h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold',
            step >= n ? 'bg-erp-accent text-white' : 'bg-slate-200 text-slate-400'
          )}>
            {step > n ? <Check className="h-3.5 w-3.5" /> : n}
          </div>
          {n < 3 && <div className={cn('h-0.5 flex-1', step > n ? 'bg-erp-accent' : 'bg-slate-200')} />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ChevronLeft className={cn('h-5 w-5', isRTL && 'rotate-180')} />
        </Button>
        <h1 className="font-display text-[16px] font-semibold text-slate-800 flex-1">
          {language === 'ar' ? 'طلب معاينة جديد' : 'New Inspection Request'}
        </h1>
      </div>

      <StepIndicator />

      {/* STEP 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">{language === 'ar' ? 'المشروع' : 'Project'} *</Label>
            <Select value={form.project_id} onValueChange={(v) => setField('project_id', v)}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select project'} /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.project_code} - {language === 'ar' ? p.project_name_ar : p.project_name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label className="text-[12px]">{language === 'ar' ? 'فترة المستخلص' : 'IPC Period'} *</Label>
              <Input type="number" value={form.ipc_period} onChange={(e) => setField('ipc_period', e.target.value)} className="h-9 text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">{language === 'ar' ? 'تاريخ المعاينة' : 'Inspection Date'} *</Label>
              <Input type="date" value={form.inspection_date} onChange={(e) => setField('inspection_date', e.target.value)} className="h-9 text-[13px]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">{language === 'ar' ? 'موقع المعاينة' : 'Inspection Location'}</Label>
            <Input value={form.inspection_location} onChange={(e) => setField('inspection_location', e.target.value)} placeholder={language === 'ar' ? 'مثال: مبنى أ - الدور الثالث' : 'e.g., Building A - 3rd Floor'} className="h-9 text-[13px]" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">{language === 'ar' ? 'ممثل الاستشاري' : 'Consultant Representative'}</Label>
            <Input value={form.consultant_representative} onChange={(e) => setField('consultant_representative', e.target.value)} className="h-9 text-[13px]" />
          </div>

          <Button className="w-full h-10 mt-2" disabled={!canNext1} onClick={() => setStep(2)}>
            {language === 'ar' ? 'التالي' : 'Next'}
            <ChevronRight className={cn('h-4 w-4 ml-1', isRTL && 'rotate-180')} />
          </Button>
        </div>
      )}

      {/* STEP 2: BOQ Items */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="text-[12px] text-slate-500">
            {language === 'ar' ? 'اختر بنود جدول الكميات وأدخل الكميات' : 'Select BOQ items and enter quantities'}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={language === 'ar' ? 'بحث في البنود...' : 'Search BOQ...'} className="h-9 pl-9 text-[13px]" />
          </div>

          {/* Added items summary */}
          {items.length > 0 && (
            <Card className="p-2.5 border-erp-accent/30 bg-blue-50/50">
              <div className="text-[11px] font-medium text-erp-accent mb-1.5">
                {language === 'ar' ? `البنود المضافة (${items.length})` : `Added Items (${items.length})`}
              </div>
              <div className="space-y-1">
                {items.map((it) => (
                  <div key={it.boq_item_id} className="flex items-center justify-between text-[11px] bg-white rounded px-2 py-1">
                    <span className="font-mono text-slate-600 truncate flex-1">{it.boq_code}</span>
                    <span className="font-mono text-slate-700 mx-2">+{it.current_quantity} {it.unit}</span>
                    <span className="font-mono text-erp-accent">{it.current_completion_percentage}%</span>
                    <button onClick={() => removeItem(it.boq_item_id)} className="ml-1.5 text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* BOQ list */}
          {boqLoading ? (
            <div className="text-center text-[12px] text-slate-400 py-6">{language === 'ar' ? 'جاري تحميل البنود...' : 'Loading BOQ...'}</div>
          ) : (
            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
              {filteredBOQ.map((b) => {
                const added = items.find((i) => i.boq_item_id === b.id);
                const prev = prevMap[b.id];
                return (
                  <Card key={b.id} className={cn('p-2.5 border-erp-border', added && 'border-erp-accent/40 bg-blue-50/30')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-slate-500">{b.system_code || b.external_code || ''}</span>
                          {added && <Check className="h-3 w-3 text-erp-accent" />}
                        </div>
                        <div className="text-[12px] text-slate-700 line-clamp-2 mt-0.5">{b.item_description || ''}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {b.uom || ''} {prev ? `· ${language === 'ar' ? 'تراكمي' : 'prev'} ${prev.cumulative_quantity || 0}` : ''}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={added ? 'outline' : 'default'}
                        className="h-7 text-[11px] gap-1 shrink-0"
                        onClick={() => { setDialogItem(b); setDialogOpen(true); }}
                      >
                        {added ? <><Plus className="h-3 w-3" />{language === 'ar' ? 'تعديل' : 'Edit'}</> : <><Plus className="h-3 w-3" />{language === 'ar' ? 'إضافة' : 'Add'}</>}
                      </Button>
                    </div>
                  </Card>
                );
              })}
              {filteredBOQ.length === 0 && (
                <div className="text-center text-[12px] text-slate-400 py-6">{language === 'ar' ? 'لا توجد بنود' : 'No items'}</div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 h-10" onClick={() => setStep(1)}>
              {language === 'ar' ? 'رجوع' : 'Back'}
            </Button>
            <Button className="flex-1 h-10" disabled={items.length === 0} onClick={() => setStep(3)}>
              {language === 'ar' ? 'مراجعة' : 'Review'}
              <ChevronRight className={cn('h-4 w-4 ml-1', isRTL && 'rotate-180')} />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Review */}
      {step === 3 && (
        <div className="space-y-3">
          <Card className="p-3 border-erp-border">
            <div className="space-y-1 text-[12px]">
              <div className="flex justify-between"><span className="text-slate-500">{language === 'ar' ? 'المشروع' : 'Project'}</span><span className="font-medium text-slate-700">{projects.find(p => p.id === form.project_id)?.project_code || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{language === 'ar' ? 'فترة المستخلص' : 'IPC Period'}</span><span className="font-medium text-slate-700">{form.ipc_period || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{language === 'ar' ? 'تاريخ المعاينة' : 'Inspection Date'}</span><span className="font-medium text-slate-700">{form.inspection_date || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{language === 'ar' ? 'عدد البنود' : 'Total Items'}</span><span className="font-medium text-slate-700">{items.length}</span></div>
            </div>
          </Card>

          <div className="space-y-1.5 max-h-[35vh] overflow-y-auto">
            {items.map((it) => (
              <Card key={it.boq_item_id} className="p-2.5 border-erp-border">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-slate-500">{it.boq_code}</span>
                  <span className="font-mono text-[12px] text-erp-accent font-semibold">{it.current_completion_percentage}%</span>
                </div>
                <div className="text-[12px] text-slate-700 line-clamp-1 mt-0.5">{it.description}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  +{it.current_quantity} {it.unit} · {language === 'ar' ? 'تراكمي' : 'cum'} {it.cumulative_quantity}
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} rows={2} className="text-[13px]" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 h-10" onClick={() => setStep(2)}>
              {language === 'ar' ? 'رجوع' : 'Back'}
            </Button>
            <Button variant="secondary" className="flex-1 h-10" disabled={!canSubmit || saving} onClick={() => handleSubmit('Draft')}>
              {language === 'ar' ? 'حفظ مسودة' : 'Save Draft'}
            </Button>
            <Button className="flex-1 h-10" disabled={!canSubmit || saving} onClick={() => handleSubmit('Submitted-to-Consultant')}>
              {saving ? '...' : (language === 'ar' ? 'إرسال' : 'Submit')}
            </Button>
          </div>
        </div>
      )}

      <QuantityEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        boqItem={dialogItem}
        previousCumulative={dialogItem ? prevMap[dialogItem.id]?.cumulative_quantity || 0 : 0}
        previousCompletion={dialogItem ? prevMap[dialogItem.id]?.current_completion_percentage || 0 : 0}
        onSave={addItem}
        language={language}
      />
    </div>
  );
}