import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatCurrency } from '@/components/shared/formatters';
import { cn } from "@/lib/utils";

export default function BudgetVsActualTable({ budgetLines, boqItems, language, isRTL }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr className="text-sm">
                <th className="p-3 text-left font-medium">{language === 'ar' ? 'البند' : 'Item'}</th>
                <th className="p-3 text-center font-medium">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                <th className="p-3 text-right font-medium">{language === 'ar' ? 'الميزانية' : 'Budget'}</th>
                <th className="p-3 text-right font-medium">{language === 'ar' ? 'الملتزم' : 'Committed'}</th>
                <th className="p-3 text-right font-medium">{language === 'ar' ? 'الفعلي' : 'Actual'}</th>
                <th className="p-3 text-right font-medium">{language === 'ar' ? 'المتاح' : 'Available'}</th>
                <th className="p-3 text-right font-medium">{language === 'ar' ? 'الانحراف' : 'Variance'}</th>
                <th className="p-3 text-center font-medium">{language === 'ar' ? 'الانحراف%' : 'Variance%'}</th>
              </tr>
            </thead>
            <tbody>
              {budgetLines.map((line, index) => {
                const boqItem = boqItems.find(b => b.id === line.boq_id);
                const available = (line.budget_amount || 0) - (line.actual_amount || 0) - (line.committed_amount || 0);
                const variance = (line.budget_amount || 0) - (line.actual_amount || 0);
                const variancePct = line.budget_amount > 0 ? ((variance / line.budget_amount) * 100) : 0;

                return (
                  <tr key={line.id || index} className="border-b hover:bg-slate-50">
                    <td className="p-3 text-sm">
                      <div className="font-medium">{boqItem?.external_code || line.line_number}</div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">
                        {language === 'ar' ? line.description_ar : line.description_en}
                      </div>
                    </td>
                    <td className="p-3 text-center text-sm">{formatNumber(line.budget_quantity, 2)}</td>
                    <td className="p-3 text-right font-mono text-sm">{formatCurrency(line.budget_amount, 'EGP', 0)}</td>
                    <td className="p-3 text-right font-mono text-sm text-amber-600">{formatCurrency(line.committed_amount, 'EGP', 0)}</td>
                    <td className="p-3 text-right font-mono text-sm text-blue-600">{formatCurrency(line.actual_amount, 'EGP', 0)}</td>
                    <td className="p-3 text-right font-mono text-sm text-emerald-600">{formatCurrency(available, 'EGP', 0)}</td>
                    <td className={cn("p-3 text-right font-mono text-sm font-medium", 
                      variance >= 0 ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {formatCurrency(variance, 'EGP', 0)}
                    </td>
                    <td className={cn("p-3 text-center text-sm font-medium",
                      variancePct >= 0 ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {formatNumber(variancePct, 1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 font-semibold">
              <tr>
                <td className="p-3 text-sm" colSpan={2}>{language === 'ar' ? 'الإجمالي' : 'Total'}</td>
                <td className="p-3 text-right font-mono text-sm">
                  {formatCurrency(budgetLines.reduce((s, l) => s + (l.budget_amount || 0), 0), 'EGP', 0)}
                </td>
                <td className="p-3 text-right font-mono text-sm text-amber-600">
                  {formatCurrency(budgetLines.reduce((s, l) => s + (l.committed_amount || 0), 0), 'EGP', 0)}
                </td>
                <td className="p-3 text-right font-mono text-sm text-blue-600">
                  {formatCurrency(budgetLines.reduce((s, l) => s + (l.actual_amount || 0), 0), 'EGP', 0)}
                </td>
                <td className="p-3 text-right font-mono text-sm text-emerald-600">
                  {formatCurrency(budgetLines.reduce((s, l) => s + ((l.budget_amount || 0) - (l.actual_amount || 0) - (l.committed_amount || 0)), 0), 'EGP', 0)}
                </td>
                <td className="p-3 text-right font-mono text-sm">
                  {formatCurrency(budgetLines.reduce((s, l) => s + ((l.budget_amount || 0) - (l.actual_amount || 0)), 0), 'EGP', 0)}
                </td>
                <td className="p-3 text-center text-sm"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}