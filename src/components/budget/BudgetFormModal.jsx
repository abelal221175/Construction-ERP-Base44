import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Loader2, Save } from 'lucide-react';
import { toast } from "sonner";

export default function BudgetFormModal({ open, onClose, project, boqItems }) {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    budget_name_ar: `ميزانية ${project?.project_name_ar || ''}`,
    budget_name_en: `Budget for ${project?.project_name_en || ''}`,
    contingency_percentage: 10,
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Calculate total from BOQ items
      const totalBudgetAmount = boqItems.reduce((sum, item) => 
        sum + ((item.quantity || 0) * (item.unit_price || 0)), 0
      );

      const contingencyAmount = totalBudgetAmount * (formData.contingency_percentage / 100);

      const budget = await base44.entities.ProjectBudget.create({
        project_id: project.id,
        budget_name_ar: formData.budget_name_ar,
        budget_name_en: formData.budget_name_en,
        budget_type: 'original',
        version_number: 1,
        is_current_version: true,
        status: 'draft',
        total_budget_amount: totalBudgetAmount + contingencyAmount,
        contingency_percentage: formData.contingency_percentage,
        contingency_amount: contingencyAmount,
        notes: formData.notes,
      });

      // Create budget lines from BOQ items
      for (const [index, item] of boqItems.entries()) {
        await base44.entities.BudgetLine.create({
          budget_id: budget.id,
          boq_id: item.id,
          line_number: index + 1,
          description_ar: item.item_description,
          description_en: item.item_description,
          budget_quantity: item.quantity || 0,
          budget_unit_cost: item.unit_price || 0,
          budget_amount: (item.quantity || 0) * (item.unit_price || 0),
        });
      }

      return budget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectBudgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgetLines'] });
      toast.success(language === 'ar' ? 'تم إنشاء الميزانية' : 'Budget created successfully');
      onClose();
    },
    onError: () => {
      toast.error(language === 'ar' ? 'حدث خطأ' : 'An error occurred');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'إنشاء ميزانية مشروع' : 'Create Project Budget'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>{language === 'ar' ? 'اسم الميزانية (عربي)' : 'Budget Name (Arabic)'}</Label>
            <Input
              value={formData.budget_name_ar}
              onChange={(e) => setFormData({ ...formData, budget_name_ar: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label>{language === 'ar' ? 'اسم الميزانية (English)' : 'Budget Name (English)'}</Label>
            <Input
              value={formData.budget_name_en}
              onChange={(e) => setFormData({ ...formData, budget_name_en: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label>{language === 'ar' ? 'نسبة الطوارئ (%)' : 'Contingency Percentage (%)'}</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.contingency_percentage}
              onChange={(e) => setFormData({ ...formData, contingency_percentage: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>

          <div>
            <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            <Save className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'إنشاء' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}