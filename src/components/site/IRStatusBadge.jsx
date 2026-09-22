import React from 'react';
import { cn } from '@/lib/utils';

const STATUS_MAP = {
  Draft: { ar: 'مسودة', en: 'Draft', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  'Submitted-to-Consultant': { ar: 'مُرسلة للاستشاري', en: 'Submitted to Consultant', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  'Under-Review': { ar: 'تحت المراجعة', en: 'Under Review', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  'Inspection-Scheduled': { ar: 'مجدولة المعاينة', en: 'Inspection Scheduled', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  'Inspection-Completed': { ar: 'تمت المعاينة', en: 'Inspection Completed', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  Approved: { ar: 'معتمد', en: 'Approved', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  Rejected: { ar: 'مرفوض', en: 'Rejected', cls: 'bg-red-100 text-red-700 border-red-200' },
  'Revision-Required': { ar: 'يتطلب تعديل', en: 'Revision Required', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  Cancelled: { ar: 'ملغي', en: 'Cancelled', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export default function IRStatusBadge({ status, language = 'en' }) {
  const s = STATUS_MAP[status] || STATUS_MAP.Draft;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap', s.cls)}>
      {language === 'ar' ? s.ar : s.en}
    </span>
  );
}

export { STATUS_MAP as IR_STATUS_MAP };