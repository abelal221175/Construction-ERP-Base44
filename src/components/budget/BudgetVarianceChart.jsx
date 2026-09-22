import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from '@/components/shared/formatters';
import { BarChart3 } from 'lucide-react';

export default function BudgetVarianceChart({ budgetLines, language }) {
  const costTypes = ['material', 'subcontractor', 'labor', 'equipment', 'service', 'indirect'];
  
  const typeLabels = {
    material: { ar: 'المواد', en: 'Materials' },
    subcontractor: { ar: 'مقاولي الباطن', en: 'Subcontractors' },
    labor: { ar: 'العمالة', en: 'Labor' },
    equipment: { ar: 'المعدات', en: 'Equipment' },
    service: { ar: 'الخدمات', en: 'Services' },
    indirect: { ar: 'تكاليف غير مباشرة', en: 'Indirect' },
  };

  const data = costTypes.map(type => {
    const typeLines = budgetLines.filter(l => l.cost_element_type === type);
    const budget = typeLines.reduce((sum, l) => sum + (l.budget_amount || 0), 0);
    const actual = typeLines.reduce((sum, l) => sum + (l.actual_amount || 0), 0);
    const committed = typeLines.reduce((sum, l) => sum + (l.committed_amount || 0), 0);
    
    return {
      type,
      label: language === 'ar' ? typeLabels[type].ar : typeLabels[type].en,
      budget,
      actual,
      committed,
      available: budget - actual - committed,
    };
  }).filter(d => d.budget > 0);

  const maxValue = Math.max(...data.map(d => d.budget));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {language === 'ar' ? 'الميزانية مقابل الفعلي' : 'Budget vs Actual'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data.map((item, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-sm text-slate-500">
                  {formatNumber(item.actual, 0)} / {formatNumber(item.budget, 0)} EGP
                </span>
              </div>
              
              <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
                {/* Budget bar (background) */}
                <div className="absolute inset-0 flex">
                  {/* Actual (spent) */}
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${(item.actual / item.budget) * 100}%` }}
                  />
                  {/* Committed */}
                  <div
                    className="bg-amber-400 h-full"
                    style={{ width: `${(item.committed / item.budget) * 100}%` }}
                  />
                  {/* Available */}
                  <div
                    className="bg-emerald-200 h-full"
                    style={{ width: `${(item.available / item.budget) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>{language === 'ar' ? 'فعلي' : 'Actual'}: {formatNumber((item.actual / item.budget) * 100, 1)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-amber-400 rounded"></div>
                  <span>{language === 'ar' ? 'ملتزم' : 'Committed'}: {formatNumber((item.committed / item.budget) * 100, 1)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-emerald-200 rounded"></div>
                  <span>{language === 'ar' ? 'متاح' : 'Available'}: {formatNumber((item.available / item.budget) * 100, 1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>{language === 'ar' ? 'الفعلي المصروف' : 'Actual Spent'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-400 rounded"></div>
            <span>{language === 'ar' ? 'الملتزم به' : 'Committed'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-200 rounded"></div>
            <span>{language === 'ar' ? 'المتاح' : 'Available'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}