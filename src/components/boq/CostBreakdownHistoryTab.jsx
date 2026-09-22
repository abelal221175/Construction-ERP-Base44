import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/shared/LanguageContext';
import { formatDateTime, formatNumber } from '@/components/shared/formatters';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send,
  User,
  Calendar,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { cn } from "@/lib/utils";

const statusConfig = {
  draft: { icon: Clock, color: 'bg-slate-100 text-slate-700', label_ar: 'مسودة', label_en: 'Draft' },
  submitted: { icon: Send, color: 'bg-amber-100 text-amber-700', label_ar: 'مقدم', label_en: 'Submitted' },
  approved: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700', label_ar: 'معتمد', label_en: 'Approved' },
  rejected: { icon: XCircle, color: 'bg-red-100 text-red-700', label_ar: 'مرفوض', label_en: 'Rejected' },
};

export default function CostBreakdownHistoryTab({ boqItem }) {
  const { language, isRTL } = useLanguage();

  const { data: allEstimations = [] } = useQuery({
    queryKey: ['costEstimations', boqItem?.id],
    queryFn: () => boqItem?.id ? base44.entities.CostEstimation.filter({ boq_id: boqItem.id }, '-version') : [],
    enabled: !!boqItem?.id,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['auditLogs', boqItem?.id],
    queryFn: async () => {
      if (!boqItem?.id) return [];
      const logs = await base44.entities.AuditLog.filter({}, '-created_date');
      return logs.filter(log => 
        log.entity_name === 'CostEstimation' && 
        log.record_id && 
        allEstimations.some(e => e.id === log.record_id)
      );
    },
    enabled: !!boqItem?.id && allEstimations.length > 0,
  });

  if (allEstimations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <FileText className="h-12 w-12 mb-3" />
        <p>{language === 'ar' ? 'لا يوجد سجل' : 'No history available'}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px] px-6 py-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800 mb-4">
          {language === 'ar' ? 'سجل الموافقات والمراجعات' : 'Approval & Review History'}
        </h3>

        {allEstimations.map((estimation, index) => {
          const StatusIcon = statusConfig[estimation.status]?.icon || Clock;
          const isCurrentVersion = estimation.is_current;
          
          return (
            <Card key={estimation.id} className={cn(
              "border-2",
              isCurrentVersion ? "border-blue-200 bg-blue-50" : "border-slate-200"
            )}>
              <CardContent className="p-4">
                {/* Version Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {language === 'ar' ? 'الإصدار' : 'Version'} {estimation.version || 1}
                    </Badge>
                    {isCurrentVersion && (
                      <Badge className="bg-blue-600">
                        {language === 'ar' ? 'الحالي' : 'Current'}
                      </Badge>
                    )}
                    <Badge className={statusConfig[estimation.status]?.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {language === 'ar' ? statusConfig[estimation.status]?.label_ar : statusConfig[estimation.status]?.label_en}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-500 font-mono">
                    EGP {formatNumber(estimation.unit_selling_price, 2)}
                  </div>
                </div>

                {/* Cost Summary */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                  <div>
                    <span className="text-slate-500">{language === 'ar' ? 'التكلفة الجافة:' : 'Dry Cost:'}</span>
                    <span className="font-semibold ml-2">EGP {formatNumber(estimation.dry_cost_per_unit, 2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">{language === 'ar' ? 'هامش الربح:' : 'Markup:'}</span>
                    <span className="font-semibold ml-2">{formatNumber(estimation.markup_percentage, 1)}%</span>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Workflow Details */}
                <div className="space-y-2 text-sm">
                  {estimation.submitted_by && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Send className="h-4 w-4 text-amber-500" />
                      <User className="h-3 w-3" />
                      <span>{language === 'ar' ? 'تم التقديم بواسطة:' : 'Submitted by:'}</span>
                      <strong>{estimation.submitted_by}</strong>
                      {estimation.submitted_date && (
                        <>
                          <Calendar className="h-3 w-3 ml-2" />
                          <span className="text-xs">{formatDateTime(estimation.submitted_date)}</span>
                        </>
                      )}
                    </div>
                  )}

                  {estimation.reviewed_by && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <User className="h-3 w-3" />
                      <span>{language === 'ar' ? 'تمت المراجعة بواسطة:' : 'Reviewed by:'}</span>
                      <strong>{estimation.reviewed_by}</strong>
                      {estimation.reviewed_date && (
                        <>
                          <Calendar className="h-3 w-3 ml-2" />
                          <span className="text-xs">{formatDateTime(estimation.reviewed_date)}</span>
                        </>
                      )}
                    </div>
                  )}

                  {estimation.approved_by && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <User className="h-3 w-3" />
                      <span>{language === 'ar' ? 'تم الاعتماد بواسطة:' : 'Approved by:'}</span>
                      <strong>{estimation.approved_by}</strong>
                      {estimation.approved_date && (
                        <>
                          <Calendar className="h-3 w-3 ml-2" />
                          <span className="text-xs">{formatDateTime(estimation.approved_date)}</span>
                        </>
                      )}
                    </div>
                  )}

                  {estimation.revision_notes && (
                    <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                      <div className="flex items-center gap-1 text-amber-700 font-medium mb-1">
                        <MessageSquare className="h-3 w-3" />
                        <span className="text-xs">{language === 'ar' ? 'ملاحظات:' : 'Notes:'}</span>
                      </div>
                      <p className="text-sm text-slate-700">{estimation.revision_notes}</p>
                    </div>
                  )}

                  {estimation.rejection_reason && (
                    <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                      <div className="flex items-center gap-1 text-red-700 font-medium mb-1">
                        <XCircle className="h-3 w-3" />
                        <span className="text-xs">{language === 'ar' ? 'سبب الرفض:' : 'Rejection Reason:'}</span>
                      </div>
                      <p className="text-sm text-slate-700">{estimation.rejection_reason}</p>
                    </div>
                  )}
                </div>

                {/* Created Info */}
                <div className="mt-3 pt-3 border-t text-xs text-slate-400">
                  {language === 'ar' ? 'تم الإنشاء:' : 'Created:'} {formatDateTime(estimation.created_date)} 
                  {estimation.created_by && <> {language === 'ar' ? 'بواسطة' : 'by'} {estimation.created_by}</>}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Audit Logs */}
        {auditLogs.length > 0 && (
          <>
            <Separator className="my-6" />
            <h4 className="font-semibold text-slate-700 mb-3">
              {language === 'ar' ? 'سجل التغييرات' : 'Change Log'}
            </h4>
            <div className="space-y-2">
              {auditLogs.map(log => (
                <div key={log.id} className="text-sm p-2 bg-slate-50 rounded border">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="font-medium">{log.action_type}</span>
                    <span>-</span>
                    <span className="text-xs text-slate-400">{formatDateTime(log.created_date)}</span>
                    {log.user_email && <span className="text-xs">({log.user_email})</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}