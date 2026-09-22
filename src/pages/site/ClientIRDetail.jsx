import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Calendar, MapPin, User, Hash, Check, X, Clock } from 'lucide-react';
import IRStatusBadge from '@/components/site/IRStatusBadge';
import { formatDate, formatNumber } from '@/components/shared/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ClientIRDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [approvalNote, setApprovalNote] = useState('');

  const { data: ir, isLoading } = useQuery({
    queryKey: ['siteIR', id],
    queryFn: () => base44.entities.ClientInspectionRequest.get(id),
    enabled: !!id,
    staleTime: 30_000,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['siteIRItems', id],
    queryFn: () => base44.entities.ClientInspectionRequestItem.filter({ ir_id: id }),
    enabled: !!id,
    staleTime: 30_000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['siteProjects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 120_000,
  });
  const project = projects.find((p) => p.id === ir?.project_id);

  const updateStatus = useMutation({
    mutationFn: async ({ status, notes }) => {
      const patch = { status };
      if (status === 'Approved') { patch.approved_at = new Date().toISOString(); patch.approval_notes = notes; }
      if (status === 'Rejected') { patch.rejection_reason = notes; }
      if (status === 'Revision-Required') { patch.approval_notes = notes; }
      await base44.entities.ClientInspectionRequest.update(id, patch);

      // On approval: sync approved quantities to ProjectBOQ for next IPC
      if (status === 'Approved' && ir?.project_id) {
        try {
          const boqItems = await base44.entities.ProjectBOQ.filter({ project_id: ir.project_id });
          for (const irItem of items) {
            // Match IR item to BOQ by code
            const boqItem = boqItems.find(b =>
              b.external_code === irItem.boq_code || b.system_code === irItem.boq_code
            );
            if (boqItem) {
              // Store approved quantity for next IPC draft
              await base44.entities.ProjectBOQ.update(boqItem.id, {
                last_approved_quantity: irItem.current_quantity || 0,
                last_approved_cumulative: irItem.cumulative_quantity || 0,
                last_approved_completion: irItem.current_completion_percentage || 0,
                last_ir_id: id,
              });
            }
          }
        } catch (e) {
          console.error('[Site Portal] BOQ sync failed:', e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteIR', id] });
      queryClient.invalidateQueries({ queryKey: ['siteIRs'] });
      toast.success(language === 'ar' ? 'تم التحديث' : 'Updated');
      setApprovalNote('');
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-[12px] text-slate-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>;
  }

  if (!ir) {
    return <div className="p-8 text-center text-[12px] text-slate-400">{language === 'ar' ? 'غير موجود' : 'Not found'}</div>;
  }

  const timeline = [
    { icon: Clock, labelAr: 'أنشئ بتاريخ', labelEn: 'Created', value: formatDate(ir.created_date), done: true },
    { icon: Check, labelAr: 'أُرسل للاستشاري', labelEn: 'Submitted', value: ir.submitted_at ? formatDate(ir.submitted_at) : '—', done: !!ir.submitted_at },
    { icon: Check, labelAr: 'تمت المعاينة', labelEn: 'Inspection Done', value: ir.inspection_completed_at ? formatDate(ir.inspection_completed_at) : '—', done: !!ir.inspection_completed_at },
    { icon: Check, labelAr: 'معتمد', labelEn: 'Approved', value: ir.approved_at ? formatDate(ir.approved_at) : '—', done: !!ir.approved_at },
  ];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ChevronLeft className={cn('h-5 w-5', isRTL && 'rotate-180')} />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[14px] font-semibold text-slate-800">{ir.ir_number}</div>
          <IRStatusBadge status={ir.status} language={language} />
        </div>
      </div>

      {/* Info card */}
      <Card className="p-3 border-erp-border mb-3">
        <div className="space-y-1.5 text-[12px]">
          <div className="flex items-center gap-2 text-slate-600"><Hash className="h-3.5 w-3.5 text-slate-400" /><span>{project?.project_code || '-'}</span></div>
          <div className="flex items-center gap-2 text-slate-600"><Calendar className="h-3.5 w-3.5 text-slate-400" /><span>{language === 'ar' ? 'فترة' : 'IPC'} {ir.ipc_period} · {formatDate(ir.inspection_date)}</span></div>
          {ir.inspection_location && <div className="flex items-center gap-2 text-slate-600"><MapPin className="h-3.5 w-3.5 text-slate-400" /><span>{ir.inspection_location}</span></div>}
          {ir.consultant_representative && <div className="flex items-center gap-2 text-slate-600"><User className="h-3.5 w-3.5 text-slate-400" /><span>{ir.consultant_representative}</span></div>}
        </div>
      </Card>

      {/* Timeline */}
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

      {/* Items */}
      <div className="text-[13px] font-semibold text-slate-700 mb-2">
        {language === 'ar' ? `البنود (${items.length})` : `Items (${items.length})`}
      </div>
      <div className="space-y-2 mb-3">
        {items.map((it) => {
          const open = expanded === it.id;
          const photos = (() => { try { return JSON.parse(it.measurement_photos || '[]'); } catch { return []; } })();
          return (
            <Card key={it.id} className="border-erp-border overflow-hidden">
              <button
                onClick={() => setExpanded(open ? null : it.id)}
                className="w-full p-3 flex items-center justify-between text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[11px] text-slate-500">{it.boq_code}</div>
                  <div className="text-[12px] text-slate-700 line-clamp-1">{it.description}</div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="font-mono text-[13px] font-semibold text-erp-accent">{it.current_completion_percentage}%</div>
                  <div className="text-[10px] text-slate-400">+{formatNumber(it.current_quantity, 2)} {it.unit}</div>
                </div>
              </button>
              {open && (
                <div className="px-3 pb-3 border-t border-erp-border/60 pt-2 text-[11px] space-y-1.5">
                  <div className="flex justify-between"><span className="text-slate-400">{language === 'ar' ? 'تراكمي سابق' : 'Prev Cumulative'}</span><span className="font-mono text-slate-600">{formatNumber(it.previous_cumulative_quantity, 2)} {it.unit}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">{language === 'ar' ? 'كمية حالية' : 'Current Qty'}</span><span className="font-mono text-slate-600">{formatNumber(it.current_quantity, 2)} {it.unit}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">{language === 'ar' ? 'تراكمي جديد' : 'New Cumulative'}</span><span className="font-mono font-semibold text-erp-accent">{formatNumber(it.cumulative_quantity, 2)} {it.unit}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">{language === 'ar' ? 'نسبة سابقة' : 'Prev %'}</span><span className="text-slate-600">{formatNumber(it.previous_completion_percentage, 1)}%</span></div>
                  {it.measurement_method && <div className="flex justify-between"><span className="text-slate-400">{language === 'ar' ? 'طريقة القياس' : 'Method'}</span><span className="text-slate-600">{it.measurement_method}</span></div>}
                  {it.location_description && <div className="text-slate-500 pt-1"><MapPin className="h-3 w-3 inline ml-1" />{it.location_description}</div>}
                  {photos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="" className="h-14 w-14 rounded object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Approval actions */}
      {ir.status === 'Submitted-to-Consultant' && (
        <Card className="p-3 border-erp-border space-y-2">
          <div className="text-[12px] font-semibold text-slate-700">{language === 'ar' ? 'إجراء الاعتماد' : 'Approval Action'}</div>
          <div className="space-y-1.5">
            <Label className="text-[11px]">{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} rows={2} className="text-[12px]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-9 gap-1.5 text-[12px]" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ status: 'Revision-Required', notes: approvalNote })}>
              <X className="h-4 w-4" />{language === 'ar' ? 'طلب تعديل' : 'Revise'}
            </Button>
            <Button className="h-9 gap-1.5 text-[12px]" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ status: 'Approved', notes: approvalNote })}>
              <Check className="h-4 w-4" />{language === 'ar' ? 'اعتماد' : 'Approve'}
            </Button>
          </div>
        </Card>
      )}

      {ir.status === 'Approved' && !ir.linked_to_ipc_id && (
        <Card className="p-3 border-emerald-200 bg-emerald-50/50">
          <div className="text-[12px] text-erp-emerald font-medium mb-1">
            {language === 'ar' ? 'جاهز لإنشاء المستخلص' : 'Ready for IPC creation'}
          </div>
          <div className="text-[11px] text-slate-500">
            {language === 'ar' ? 'يمكن إنشاء مستخلص العميل من هذا الطلب في النظام الرئيسي.' : 'A client IPC can be generated from this approved IR in the main ERP.'}
          </div>
        </Card>
      )}

      {ir.notes && (
        <Card className="p-3 border-erp-border mt-3">
          <div className="text-[11px] text-slate-400 mb-1">{language === 'ar' ? 'ملاحظات' : 'Notes'}</div>
          <div className="text-[12px] text-slate-600">{ir.notes}</div>
        </Card>
      )}
    </div>
  );
}