import React from 'react';
import { useLanguage } from '@/components/shared/LanguageContext';
import { formatNumber } from '@/components/shared/formatters';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Receipt } from 'lucide-react';

export default function IPCSummaryCard({
  summary,
  deductions = [],
  additions = [],
  vatPercentage = 14,
  className,
}) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  const {
    cumulativeGross = 0,
    previousCertified = 0,
    currentGross = 0,
    totalDeductions = 0,
    totalAdditions = 0,
    subtotalBeforeVat = 0,
    vatAmount = 0,
    whtAmount = 0,
    netPayable = 0,
  } = summary;

  const Row = ({ label, value, variant = 'default', isBold, isTotal, indent }) => (
    <div className={cn(
      "flex justify-between py-1",
      isBold && "font-semibold",
      isTotal && "text-lg py-2",
      indent && "pl-3",
    )}>
      <span className={cn(
        variant === 'neg' && "text-red-400",
        variant === 'pos' && "text-emerald-400",
      )}>
        {variant === 'neg' && '(-) '}
        {variant === 'pos' && '(+) '}
        {label}
      </span>
      <span className={cn(
        "font-mono",
        variant === 'neg' && "text-red-400",
        variant === 'pos' && "text-emerald-400",
        isTotal && "text-emerald-400",
      )}>
        {variant === 'neg' && '-'}{formatNumber(Math.abs(value), 2)}
      </span>
    </div>
  );

  return (
    <Card className={cn("bg-gradient-to-br from-slate-900 to-slate-800 text-white sticky top-4", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          {ar ? 'مسلسل المستخلص' : 'IPC Waterfall'}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {/* Step 1: Cumulative Total */}
        <Row label={ar ? 'الإجمالي التراكمي' : 'Cumulative Total'} value={cumulativeGross} />

        {/* Step 2: Less Previously Certified */}
        <Row label={ar ? 'الخصم: المعتمد سابقاً' : 'Less: Previously Certified'} value={previousCertified} variant="neg" />

        {/* Step 3: This-Period Total */}
        <Separator className="bg-slate-600 my-1" />
        <Row label={ar ? 'إجمالي هذه الفترة' : 'This-Period Total'} value={currentGross} isBold />
        <Separator className="bg-slate-700 my-2" />

        {/* Step 4: Deductions */}
        {deductions.length > 0 && (
          <div className="space-y-0.5">
            <p className="text-xs text-slate-400 mb-1">{ar ? 'الخصومات:' : 'Deductions:'}</p>
            {deductions.map((d, i) => (
              <Row
                key={i}
                label={`${d.label}${d.percentage ? ` (${formatNumber(d.percentage, 1)}%)` : ''}`}
                value={d.amount}
                variant="neg"
                indent
              />
            ))}
          </div>
        )}

        {/* Step 5: Additions */}
        {additions.length > 0 && (
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-slate-400 mb-1">{ar ? 'الإضافات:' : 'Additions:'}</p>
            {additions.map((a, i) => (
              <Row key={i} label={a.label} value={a.amount} variant="pos" indent />
            ))}
          </div>
        )}

        {/* Step 6: Subtotal Before VAT */}
        <Separator className="bg-slate-600 my-1" />
        <Row label={ar ? 'الصافي قبل الضريبة' : 'Subtotal Before VAT'} value={subtotalBeforeVat} isBold />

        {/* Step 7: VAT */}
        <Row label={`${ar ? 'ضريبة القيمة المضافة' : 'VAT'} (${vatPercentage}%)`} value={vatAmount} variant="pos" />

        {/* Step 8: WHT */}
        {whtAmount > 0 && (
          <Row label={ar ? 'ضريبة الخصم تحت الحساب' : 'Withholding Tax (WHT)'} value={whtAmount} variant="neg" />
        )}

        {/* Step 9: Cheque Total */}
        <Separator className="bg-slate-500 my-2" />
        <div className="bg-emerald-900/50 -mx-4 px-4 py-3 rounded-lg mt-2">
          <Row label={ar ? 'إجمالي الشيك' : 'CHEQUE TOTAL'} value={netPayable} isTotal />
        </div>
      </CardContent>
    </Card>
  );
}
