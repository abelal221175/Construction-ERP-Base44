import React from 'react';
import { useLanguage } from '@/components/shared/LanguageContext';
import { formatNumber, formatCurrency } from '@/components/shared/formatters';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Calculator, Receipt } from 'lucide-react';

export default function IPCSummaryCard({
  summary,
  deductions = [],
  additions = [],
  vatPercentage = 14,
  className,
}) {
  const { language, isRTL } = useLanguage();

  const {
    cumulativeGross = 0,
    previousCertified = 0,
    currentGross = 0,
    advanceRecovery = 0,
    retentionAmount = 0,
    totalDeductions = 0,
    totalAdditions = 0,
    taxableNet = 0,
    subtotalBeforeVat = 0,
    vatAmount = 0,
    whtAmount = 0,
    netPayable = 0,
  } = summary;

  const SummaryLine = ({ label, value, isNegative, isPositive, isBold, isTotal, className: lineClass }) => (
    <div className={cn(
      "flex justify-between py-1",
      isBold && "font-semibold",
      isTotal && "text-lg py-2",
      lineClass
    )}>
      <span className={cn(isNegative && "text-red-400", isPositive && "text-emerald-400")}>
        {isNegative && '(-) '}
        {isPositive && '(+) '}
        {label}
      </span>
      <span className={cn(
        "font-mono",
        isNegative && "text-red-400",
        isPositive && "text-emerald-400",
        isTotal && "text-emerald-400"
      )}>
        {isNegative && '-'}{formatNumber(Math.abs(value), 2)}
      </span>
    </div>
  );

  return (
    <Card className={cn("bg-gradient-to-br from-slate-900 to-slate-800 text-white sticky top-4", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          {language === 'ar' ? 'ملخص المستخلص' : 'IPC Summary'}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {/* Gross Amounts */}
        <div className="space-y-1">
          <SummaryLine
            label={language === 'ar' ? 'الإجمالي التراكمي' : 'Cumulative Gross'}
            value={cumulativeGross}
          />
          <SummaryLine
            label={language === 'ar' ? 'المبلغ السابق' : 'Previous Certified'}
            value={previousCertified}
            isNegative
          />
          <Separator className="bg-slate-700 my-2" />
          <SummaryLine
            label={language === 'ar' ? 'الإجمالي الحالي' : 'Current Gross'}
            value={currentGross}
            isBold
          />
        </div>

        {/* Deductions */}
        {deductions.length > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-700">
            <p className="text-xs text-slate-400 mb-1">{language === 'ar' ? 'الخصومات:' : 'Deductions:'}</p>
            {deductions.map((d, i) => (
              <SummaryLine
                key={i}
                label={`${d.label}${d.percentage ? ` (${formatNumber(d.percentage, 1)}%)` : ''}`}
                value={d.amount}
                isNegative
                className="text-xs py-0.5"
              />
            ))}
          </div>
        )}

        {/* Additions */}
        {additions.length > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-700">
            <p className="text-xs text-slate-400 mb-1">{language === 'ar' ? 'الإضافات:' : 'Additions:'}</p>
            {additions.map((a, i) => (
              <SummaryLine
                key={i}
                label={a.label}
                value={a.amount}
                isPositive
                className="text-xs py-0.5"
              />
            ))}
          </div>
        )}

        {/* Totals */}
        <div className="mt-3 pt-2 border-t border-slate-700 space-y-1">
          <SummaryLine
            label={language === 'ar' ? 'إجمالي الخصومات' : 'Total Deductions'}
            value={totalDeductions}
            isNegative
          />
          <SummaryLine
            label={language === 'ar' ? 'إجمالي الإضافات' : 'Total Additions'}
            value={totalAdditions}
            isPositive
          />
        </div>

        <Separator className="bg-slate-600 my-2" />
        
        <SummaryLine
          label={language === 'ar' ? 'الصافي قبل الضريبة' : 'Subtotal Before VAT'}
          value={subtotalBeforeVat}
          isBold
        />
        
        <SummaryLine
          label={`${language === 'ar' ? 'ضريبة القيمة المضافة' : 'VAT'} (${vatPercentage}%)`}
          value={vatAmount}
          isPositive
        />

        {whtAmount > 0 && (
          <SummaryLine
            label={language === 'ar' ? 'ضريبة الخصم تحت الحساب' : 'Withholding Tax (WHT)'}
            value={whtAmount}
            isNegative
          />
        )}

        <Separator className="bg-slate-500 my-2" />
        
        <div className="bg-emerald-900/50 -mx-4 px-4 py-3 rounded-lg mt-2">
          <SummaryLine
            label={language === 'ar' ? 'صافي المستحق' : 'NET PAYABLE'}
            value={netPayable}
            isTotal
          />
        </div>
      </CardContent>
    </Card>
  );
}