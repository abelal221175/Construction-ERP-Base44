import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from 'lucide-react';
import { toast } from "sonner";

export default function SaveTemplateModal({ open, onClose, boqItem }) {
  const { language, isRTL, dir } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    template_code: '',
    template_name_ar: '',
    template_name_en: '',
    work_category_id: '',
    default_markup_percentage: 40,
  });

  // Fetch cost estimation details for this BOQ item
  const { data: costEstimation } = useQuery({
    queryKey: ['costEstimation', boqItem?.id],
    queryFn: async () => {
      if (!boqItem?.id) return null;
      const estimations = await base44.entities.CostEstimation.filter({ boq_id: boqItem.id, is_current: true });
      if (estimations.length > 0) {
        const details = await base44.entities.CostEstimationDetail.filter({ estimation_id: estimations[0].id });
        return { estimation: estimations[0], details };
      }
      return null;
    },
    enabled: !!boqItem?.id,
  });

  const { data: workCategories = [] } = useQuery({
    queryKey: ['workCategories'],
    queryFn: () => base44.entities.WorkCategory.list(),
  });

  useEffect(() => {
    if (boqItem) {
      setFormData(prev => ({
        ...prev,
        template_code: `TPL-${Date.now()}`,
        template_name_ar: boqItem.item_description?.substring(0, 50) || '',
        template_name_en: boqItem.item_description?.substring(0, 50) || '',
        work_category_id: boqItem.work_category_id || '',
        default_markup_percentage: costEstimation?.estimation?.markup_percentage || 40,
      }));
    }
  }, [boqItem, costEstimation]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const templateDetails = costEstimation?.details?.map(d => ({
        cost_element_type: d.cost_element_type,
        resource_id: d.resource_id,
        description_ar: d.description_ar,
        description_en: d.description_en,
        quantity_per_unit: d.quantity_per_unit,
        uom_ar: d.uom_ar,
        uom_en: d.uom_en,
        unit_cost: d.unit_cost,
        total_per_unit: d.total_per_unit,
      })) || [];

      const template = await base44.entities.BOQTemplate.create({
        company_id: currentCompany?.id,
        template_code: formData.template_code,
        template_name_ar: formData.template_name_ar,
        template_name_en: formData.template_name_en,
        work_category_id: formData.work_category_id,
        item_description_ar: boqItem.item_description,
        item_description_en: boqItem.item_description,
        uom_ar: boqItem.uom,
        uom_en: boqItem.uom,
        standard_unit_price: costEstimation?.estimation?.unit_selling_price || boqItem.unit_price,
        default_markup_percentage: formData.default_markup_percentage,
        template_details: JSON.stringify(templateDetails),
        is_active: true,
        usage_count: 0,
      });

      // Link estimation to template
      if (costEstimation?.estimation) {
        await base44.entities.CostEstimation.update(costEstimation.estimation.id, {
          saved_as_template_id: template.id,
        });
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boqTemplates'] });
      toast.success(language === 'ar' ? 'تم حفظ القالب بنجاح' : 'Template saved successfully');
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir={dir}>
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'حفظ كقالب' : 'Save as Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'كود القالب' : 'Template Code'}</Label>
            <Input
              value={formData.template_code}
              onChange={(e) => setFormData({ ...formData, template_code: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'اسم القالب (عربي)' : 'Template Name (Arabic)'}</Label>
            <Input
              value={formData.template_name_ar}
              onChange={(e) => setFormData({ ...formData, template_name_ar: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'اسم القالب (إنجليزي)' : 'Template Name (English)'}</Label>
            <Input
              value={formData.template_name_en}
              onChange={(e) => setFormData({ ...formData, template_name_en: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'تصنيف العمل' : 'Work Category'}</Label>
            <Select 
              value={formData.work_category_id} 
              onValueChange={(v) => setFormData({ ...formData, work_category_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر...' : 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                {workCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.category_name_ar || cat.category_name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'نسبة الربح الافتراضية %' : 'Default Markup %'}</Label>
            <Input
              type="number"
              value={formData.default_markup_percentage}
              onChange={(e) => setFormData({ ...formData, default_markup_percentage: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {costEstimation?.details && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <p className="font-medium mb-1">
                {language === 'ar' ? 'تفاصيل التكلفة المضمنة:' : 'Included cost details:'}
              </p>
              <p className="text-slate-600">
                {costEstimation.details.length} {language === 'ar' ? 'بند' : 'items'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !formData.template_name_ar}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <Save className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'حفظ' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}