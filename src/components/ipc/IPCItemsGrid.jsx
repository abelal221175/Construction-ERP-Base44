import React from 'react';
import { useLanguage } from '@/components/shared/LanguageContext';
import { formatNumber } from '@/components/shared/formatters';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AlertTriangle } from 'lucide-react';

export default function IPCItemsGrid({ 
  items, 
  onItemChange, 
  isEditable = true,
  showWarnings = true 
}) {
  const { language, isRTL } = useLanguage();

  const handleChange = (index, field, value) => {
    if (!isEditable) return;
    onItemChange(index, field, parseFloat(value) || 0);
  };

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-100">
            <TableHead className="min-w-[60px] text-center">#</TableHead>
            <TableHead className="min-w-[250px]">
              {language === 'ar' ? 'البند' : 'Description'}
            </TableHead>
            <TableHead className="text-center w-20">{language === 'ar' ? 'وحدة' : 'Unit'}</TableHead>
            <TableHead className="text-right w-28 bg-slate-50">
              {language === 'ar' ? 'كمية العقد' : 'BOQ Qty'}
            </TableHead>
            <TableHead className="text-right w-28 bg-slate-50">
              {language === 'ar' ? 'السعر' : 'Price'}
            </TableHead>
            <TableHead className="text-right w-28 bg-amber-50/50">
              {language === 'ar' ? 'الكمية السابقة' : 'Prev Qty'}
            </TableHead>
            <TableHead className="text-center w-32 bg-blue-100 font-semibold">
              {language === 'ar' ? 'الكمية الحالية ⚡' : 'Curr Qty ⚡'}
            </TableHead>
            <TableHead className="text-right w-28 bg-emerald-50">
              {language === 'ar' ? 'الكمية التراكمية' : 'Cum Qty'}
            </TableHead>
            <TableHead className="text-center w-24 bg-blue-100 font-semibold">
              {language === 'ar' ? '% الإتمام ⚡' : 'Comp % ⚡'}
            </TableHead>
            <TableHead className="text-right w-32 bg-amber-50/50">
              {language === 'ar' ? 'المبلغ السابق' : 'Prev Amt'}
            </TableHead>
            <TableHead className="text-right w-36 bg-emerald-50">
              {language === 'ar' ? 'المبلغ التراكمي' : 'Cum Amt'}
            </TableHead>
            <TableHead className="text-right w-36 bg-green-100 font-semibold">
              {language === 'ar' ? 'المبلغ الحالي' : 'Current Amt'}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => {
            const overQuantity = item.cumulative_quantity > item.boq_quantity;
            
            return (
              <TableRow 
                key={item.boq_id || index} 
                className={cn(
                  "hover:bg-slate-50",
                  overQuantity && showWarnings && "bg-amber-50/30"
                )}
              >
                <TableCell className="text-center font-mono text-xs text-slate-500">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div>
                    <span className="font-mono text-xs text-slate-400 block">
                      {item.item_code}
                    </span>
                    <span className="text-sm">{item.item_description}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center text-sm">{item.uom}</TableCell>
                <TableCell className="text-right font-mono text-sm bg-slate-50/50">
                  {formatNumber(item.boq_quantity, 2)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm bg-slate-50/50">
                  {formatNumber(item.unit_price, 2)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-slate-500 bg-amber-50/30">
                  {formatNumber(item.previous_quantity, 2)}
                </TableCell>
                <TableCell className="bg-blue-50/50">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.current_quantity || ''}
                    onChange={(e) => handleChange(index, 'current_quantity', e.target.value)}
                    className="h-8 w-full text-right font-mono text-sm border-blue-200 focus:border-blue-400"
                    disabled={!isEditable}
                    placeholder="0.00"
                  />
                </TableCell>
                <TableCell className="bg-emerald-50/30">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-mono text-sm font-semibold">
                      {formatNumber(item.cumulative_quantity, 2)}
                    </span>
                    {overQuantity && showWarnings && (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="bg-blue-50/50">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={item.completion_percentage || ''}
                    onChange={(e) => handleChange(index, 'completion_percentage', e.target.value)}
                    className="h-8 w-full text-center font-mono text-sm border-blue-200 focus:border-blue-400"
                    disabled={!isEditable}
                    placeholder="100"
                  />
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-slate-500 bg-amber-50/30">
                  {formatNumber(item.previous_amount, 2)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-medium bg-emerald-50/30">
                  {formatNumber(item.cumulative_amount, 2)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-bold text-emerald-700 bg-green-50">
                  {formatNumber(item.current_amount, 2)}
                </TableCell>
              </TableRow>
            );
          })}
          
          {/* Totals Row */}
          <TableRow className="bg-slate-200 font-semibold">
            <TableCell colSpan={5} className="text-right">
              {language === 'ar' ? 'الإجمالي' : 'TOTAL'}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatNumber(items.reduce((s, i) => s + (i.previous_quantity || 0), 0), 2)}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatNumber(items.reduce((s, i) => s + (i.current_quantity || 0), 0), 2)}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatNumber(items.reduce((s, i) => s + (i.cumulative_quantity || 0), 0), 2)}
            </TableCell>
            <TableCell />
            <TableCell className="text-right font-mono">
              {formatNumber(items.reduce((s, i) => s + (i.previous_amount || 0), 0), 2)}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatNumber(items.reduce((s, i) => s + (i.cumulative_amount || 0), 0), 2)}
            </TableCell>
            <TableCell className="text-right font-mono text-emerald-700">
              {formatNumber(items.reduce((s, i) => s + (i.current_amount || 0), 0), 2)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}