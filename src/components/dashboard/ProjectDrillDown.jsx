import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatCurrency, formatDate, formatNumber } from '@/components/shared/formatters';
import { getStatusColor } from '@/components/shared/formatters';
import { cn } from '@/lib/utils';
import {
  Briefcase, Calendar, DollarSign, Users, FileText,
  ShoppingCart, ExternalLink, TrendingUp, Percent
} from 'lucide-react';

function InfoRow({ icon: Icon, label, value, className }) {
  return (
    <div className={cn("flex items-center gap-3 py-2", className)}>
      <div className="h-7 w-7 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-slate-600" />
      </div>
      <div className="flex-1 flex items-center justify-between min-w-0">
        <span className="text-sm text-slate-500">{label}</span>
        <span className="text-sm font-medium text-slate-900 text-right">{value || '-'}</span>
      </div>
    </div>
  );
}

export default function ProjectDrillDown({ project, language, isRTL, open, onClose, pos, ipcs, bps }) {
  if (!project) return null;

  const projectPOs = pos.filter(po => po.project_id === project.id);
  const projectIPCs = ipcs.filter(ipc => ipc.project_id === project.id);

  const totalPOValue = projectPOs.reduce((s, po) => s + (po.total_amount || 0), 0);
  const totalBilled = projectIPCs.reduce((s, ipc) => s + (ipc.current_amount || ipc.net_payable_amount || 0), 0);
  const totalPaid = projectIPCs.filter(i => i.status === 'paid').reduce((s, ipc) => s + (ipc.net_payable_amount || 0), 0);

  const client = bps.find(bp => bp.id === project.client_id);
  const consultant = bps.find(bp => bp.id === project.consultant_id);

  const completionPct = project.contract_value
    ? Math.min(100, ((totalBilled / project.contract_value) * 100)).toFixed(1)
    : 0;

  const STATUS_LABELS = {
    active: { ar: 'نشط', en: 'Active' },
    completed: { ar: 'مكتمل', en: 'Completed' },
    on_hold: { ar: 'معلق', en: 'On Hold' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' },
    planning: { ar: 'تخطيط', en: 'Planning' },
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            {language === 'ar' ? project.project_name_ar : project.project_name_en}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status + Code */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="font-mono text-xs">{project.project_code}</Badge>
            <Badge className={cn("text-xs", getStatusColor(project.status))}>
              {STATUS_LABELS[project.status]?.[language] || project.status}
            </Badge>
          </div>

          {/* Key Info */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-1 divide-y divide-slate-100">
            <InfoRow icon={DollarSign} label={language === 'ar' ? 'قيمة العقد' : 'Contract Value'} value={formatCurrency(project.contract_value, 'EGP', 0)} />
            <InfoRow icon={Calendar} label={language === 'ar' ? 'تاريخ البدء' : 'Start Date'} value={formatDate(project.start_date)} />
            <InfoRow icon={Calendar} label={language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'} value={formatDate(project.end_date)} />
            <InfoRow icon={Users} label={language === 'ar' ? 'العميل' : 'Client'} value={client ? (language === 'ar' ? client.bp_name_ar : client.bp_name_en) : '-'} />
            <InfoRow icon={Users} label={language === 'ar' ? 'الاستشاري' : 'Consultant'} value={consultant ? (language === 'ar' ? consultant.bp_name_ar : consultant.bp_name_en) : '-'} />
          </div>

          {/* Financial KPIs */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
              {language === 'ar' ? 'المؤشرات المالية' : 'Financial KPIs'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-sm font-bold text-blue-700">{formatCurrency(totalPOValue, 'EGP', 0)}</p>
                <p className="text-xs text-blue-500">{language === 'ar' ? 'قيمة الأوامر' : 'PO Value'}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-sm font-bold text-emerald-700">{formatCurrency(totalBilled, 'EGP', 0)}</p>
                <p className="text-xs text-emerald-500">{language === 'ar' ? 'إجمالي المستخلص' : 'Total Billed'}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-sm font-bold text-amber-700">{formatCurrency(totalPaid, 'EGP', 0)}</p>
                <p className="text-xs text-amber-500">{language === 'ar' ? 'إجمالي المحصل' : 'Total Collected'}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-sm font-bold text-purple-700">{completionPct}%</p>
                <p className="text-xs text-purple-500">{language === 'ar' ? 'نسبة الاستخلاص' : 'Billing %'}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{language === 'ar' ? 'تقدم الاستخلاص' : 'Billing Progress'}</span>
                <span>{completionPct}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, completionPct)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Related Records */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-4 w-4 text-orange-600" />
                <p className="text-xs font-semibold text-slate-600">{language === 'ar' ? 'أوامر الشراء' : 'Purchase Orders'}</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(projectPOs.length, 0)}</p>
              <p className="text-xs text-slate-400">{formatCurrency(totalPOValue, 'EGP', 0)}</p>
            </div>
            <div className="border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-green-600" />
                <p className="text-xs font-semibold text-slate-600">{language === 'ar' ? 'المستخلصات' : 'IPCs'}</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(projectIPCs.length, 0)}</p>
              <p className="text-xs text-slate-400">{formatCurrency(totalBilled, 'EGP', 0)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button asChild size="sm" className="flex-1">
              <Link to={createPageUrl('ProjectDetails') + `?id=${project.id}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'عرض تفاصيل المشروع' : 'View Project Details'}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link to={createPageUrl('BOQ') + `?project_id=${project.id}`}>
                <TrendingUp className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'جدول الكميات' : 'BOQ'}
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}