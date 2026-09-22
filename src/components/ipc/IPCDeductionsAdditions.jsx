import React from 'react';
import { useLanguage } from '@/components/shared/LanguageContext';
import { formatNumber } from '@/components/shared/formatters';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Minus, PlusCircle } from 'lucide-react';

const deductionCategories = [
  { value: 'retention', label_ar: 'ضمان الأعمال', label_en: 'Retention', isPercentage: true },
  { value: 'advance_recovery', label_ar: 'استرداد الدفعة المقدمة', label_en: 'Advance Recovery', isPercentage: true },
  { value: 'penalty', label_ar: 'غرامات', label_en: 'Penalties', isPercentage: false },
  { value: 'insurance', label_ar: 'تأمين', label_en: 'Insurance', isPercentage: true },
  { value: 'backcharge', label_ar: 'مقاصة', label_en: 'Backcharge', isPercentage: false },
  { value: 'discount', label_ar: 'خصم', label_en: 'Discount', isPercentage: false },
  { value: 'other', label_ar: 'أخرى', label_en: 'Other', isPercentage: false },
];

const additionCategories = [
  { value: 'variation', label_ar: 'أمر تغيير', label_en: 'Variation Order', isPercentage: false },
  { value: 'escalation', label_ar: 'تصعيد أسعار', label_en: 'Price Escalation', isPercentage: false },
  { value: 'materials_on_site', label_ar: 'مواد بالموقع', label_en: 'Materials on Site', isPercentage: false },
  { value: 'other', label_ar: 'أخرى', label_en: 'Other', isPercentage: false },
];

export default function IPCDeductionsAdditions({
  deductions = [],
  additions = [],
  onDeductionsChange,
  onAdditionsChange,
  currentGross = 0,
  isEditable = true,
}) {
  const { language, isRTL } = useLanguage();


  const addDeduction = () => {
    onDeductionsChange([
      ...deductions,
      { category: 'other', description_ar: '', description_en: '', is_percentage: false, percentage: 0, amount: 0 }
    ]);
  };

  const addAddition = () => {
    onAdditionsChange([
      ...additions,
      { category: 'other', description_ar: '', description_en: '', reference: '', amount: 0 }
    ]);
  };

  const updateDeduction = (index, field, value) => {
    const updated = [...deductions];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate amount if percentage-based
    if (field === 'percentage' || field === 'is_percentage') {
      if (updated[index].is_percentage && currentGross > 0) {
        updated[index].amount = currentGross * (parseFloat(updated[index].percentage) || 0) / 100;
      }
    }
    
    // When category changes, set is_percentage based on category
    if (field === 'category') {
      const cat = deductionCategories.find(c => c.value === value);
      if (cat) {
        updated[index].is_percentage = cat.isPercentage;
        if (cat.isPercentage && currentGross > 0) {
          updated[index].amount = currentGross * (parseFloat(updated[index].percentage) || 0) / 100;
        }
      }
    }
    
    onDeductionsChange(updated);
  };

  const updateAddition = (index, field, value) => {
    const updated = [...additions];
    updated[index] = { ...updated[index], [field]: value };
    onAdditionsChange(updated);
  };

  const removeDeduction = (index) => {
    onDeductionsChange(deductions.filter((_, i) => i !== index));
  };

  const removeAddition = (index) => {
    onAdditionsChange(additions.filter((_, i) => i !== index));
  };

  const totalDeductions = deductions.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const totalAdditions = additions.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Deductions */}
      <Card className="border-red-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-red-700">
            <Minus className="h-4 w-4" />
            {language === 'ar' ? 'الخصومات' : 'Deductions'}
            <span className="font-mono text-sm">({formatNumber(totalDeductions, 2)})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {deductions.map((item, index) => {
            return (
              <div key={index} className="flex items-center gap-2 p-2 bg-red-50/50 rounded-lg">
                <Select
                  value={item.category}
                  onValueChange={(v) => updateDeduction(index, 'category', v)}
                  disabled={!isEditable}
                >
                  <SelectTrigger className="w-40 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deductionCategories.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {language === 'ar' ? c.label_ar : c.label_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {item.is_percentage ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={item.percentage || ''}
                      onChange={(e) => updateDeduction(index, 'percentage', parseFloat(e.target.value) || 0)}
                      className="w-20 h-8 text-right text-sm"
                      disabled={!isEditable}
                      placeholder="0"
                    />
                    <span className="text-sm">%</span>
                  </div>
                ) : (
                  <Input
                    placeholder={language === 'ar' ? 'الوصف' : 'Description'}
                    value={language === 'ar' ? item.description_ar : item.description_en}
                    onChange={(e) => updateDeduction(index, language === 'ar' ? 'description_ar' : 'description_en', e.target.value)}
                    className="flex-1 h-8 text-sm"
                    disabled={!isEditable}
                  />
                )}
                
                <Input
                  type="number"
                  step="0.01"
                  value={item.amount || ''}
                  onChange={(e) => updateDeduction(index, 'amount', parseFloat(e.target.value) || 0)}
                  className={cn("w-32 h-8 text-right text-sm font-mono", item.is_percentage && "bg-slate-50")}
                  disabled={!isEditable || item.is_percentage}
                  placeholder="0.00"
                />
                
                {isEditable && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => removeDeduction(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
          
          {isEditable && (
            <Button variant="outline" size="sm" onClick={addDeduction} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              {language === 'ar' ? 'إضافة خصم' : 'Add Deduction'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Additions */}
      <Card className="border-emerald-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
            <PlusCircle className="h-4 w-4" />
            {language === 'ar' ? 'الإضافات' : 'Additions'}
            <span className="font-mono text-sm">({formatNumber(totalAdditions, 2)})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {additions.map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-emerald-50/50 rounded-lg">
              <Select
                value={item.category}
                onValueChange={(v) => updateAddition(index, 'category', v)}
                disabled={!isEditable}
              >
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {additionCategories.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      {language === 'ar' ? c.label_ar : c.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                placeholder={language === 'ar' ? 'المرجع' : 'Reference'}
                value={item.reference || ''}
                onChange={(e) => updateAddition(index, 'reference', e.target.value)}
                className="w-28 h-8 text-sm"
                disabled={!isEditable}
              />
              
              <Input
                type="number"
                step="0.01"
                value={item.amount || ''}
                onChange={(e) => updateAddition(index, 'amount', parseFloat(e.target.value) || 0)}
                className="w-32 h-8 text-right text-sm font-mono"
                disabled={!isEditable}
                placeholder="0.00"
              />
              
              {isEditable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700"
                  onClick={() => removeAddition(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          
          {isEditable && (
            <Button variant="outline" size="sm" onClick={addAddition} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              {language === 'ar' ? 'إضافة بند' : 'Add Item'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}