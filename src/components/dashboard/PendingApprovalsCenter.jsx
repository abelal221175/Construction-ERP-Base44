import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/components/shared/formatters';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PendingApprovalsCenter({ approvals, language, isRTL }) {
  const queryClient = useQueryClient();
  const pending = (approvals || []).filter(a => a.status === 'pending');

  const approveMut = useMutation({
    mutationFn: (id) => base44.entities.ApprovalRequest.update(id, {
      status: 'approved',
      action_date: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] });
      toast.success(language === 'ar' ? 'تمت الموافقة' : 'Approved');
    },
  });

  const rejectMut = useMutation({
    mutationFn: (id) => base44.entities.ApprovalRequest.update(id, {
      status: 'rejected',
      action_date: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] });
      toast.success(language === 'ar' ? 'تم الرفض' : 'Rejected');
    },
  });

  if (!pending.length) {
    return (
      <div className="text-center text-slate-400 text-sm py-12">
        {language === 'ar' ? 'لا توجد موافقات معلقة' : 'No pending approvals'}
      </div>
    );
  }

  return (
    <div className="divide-y divide-erp-border">
      {pending.map(a => (
        <div key={a.id} className="flex items-center justify-between gap-3 py-2.5 px-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-slate-800 font-mono">{a.document_number || a.request_number || '-'}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wide">{a.document_type || a.module_code || ''}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {language === 'ar' ? 'الطالب' : 'Requester'}: {a.requested_by || a.requester_name || '-'} · {formatDate(a.request_date || a.created_date)}
            </p>
          </div>
          <div className="text-end shrink-0">
            <p className="text-[13px] font-mono font-medium text-slate-700">{formatCurrency(a.amount || 0, 'EGP', 0)}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              className="h-7 px-2 text-[11px] bg-erp-emerald hover:bg-erp-emerald/90 gap-1"
              disabled={approveMut.isPending || rejectMut.isPending}
              onClick={() => approveMut.mutate(a.id)}
            >
              <Check className="h-3.5 w-3.5" />
              {language === 'ar' ? 'موافقة' : 'Approve'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px] text-erp-ruby border-erp-ruby/30 hover:bg-red-50 gap-1"
              disabled={approveMut.isPending || rejectMut.isPending}
              onClick={() => rejectMut.mutate(a.id)}
            >
              <X className="h-3.5 w-3.5" />
              {language === 'ar' ? 'رفض' : 'Reject'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}