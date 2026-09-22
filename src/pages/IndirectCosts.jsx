import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatNumber } from '@/components/shared/formatters';

const COST_TYPES = [
  { key: 'site_overhead', ar: 'مصاريف موقع', en: 'Site Overhead' },
  { key: 'general_admin', ar: 'إدارية عامة', en: 'General Admin' },
  { key: 'insurance', ar: 'تأمين', en: 'Insurance' },
  { key: 'utilities', ar: 'مرافق', en: 'Utilities' },
  { key: 'other', ar: 'أخرى', en: 'Other' },
];

const CALC_METHODS = [
  { key: 'fixed', ar: 'مبلغ ثابت', en: 'Fixed Amount' },
  { key: 'percentage', ar: 'نسبة مئوية', en: 'Percentage' },
];

const initialFormData = {
  item_code: '',
  item_name_ar: '',
  item_name_en: '',
  cost_type: 'other',
  calculation_method: 'fixed',
  default_value: '',
  default_percentage: '',
  gl_account_id: '',
  is_active: true
};

export default function IndirectCosts() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['indirectCosts', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.IndirectCostItem.filter({ company_id: currentCompany.id }) : base44.entities.IndirectCostItem.list(),
  });

  const { data: glAccounts = [] } = useQuery({
    queryKey: ['glAccounts'],
    queryFn: () => base44.entities.GLAccount.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.IndirectCostItem.create({ ...data, company_id: currentCompany?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indirectCosts'] });
      setModalOpen(false);
      toast.success(language === 'ar' ? 'تم الإنشاء بنجاح' : 'Created successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.IndirectCostItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indirectCosts'] });
      setModalOpen(false);
      toast.success(language === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.IndirectCostItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indirectCosts'] });
      setDeleteOpen(false);
      toast.success(language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
    }
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData(initialFormData);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns = [
    { header: language === 'ar' ? 'الكود' : 'Code', accessorKey: 'item_code' },
    { header: language === 'ar' ? 'الاسم' : 'Name', accessorKey: language === 'ar' ? 'item_name_ar' : 'item_name_en' },
    { 
      header: language === 'ar' ? 'النوع' : 'Type', 
      accessorKey: 'cost_type',
      cell: (row) => {
        const type = COST_TYPES.find(t => t.key === row.cost_type);
        return <Badge variant="outline">{language === 'ar' ? type?.ar : type?.en}</Badge>;
      }
    },
    { 
      header: language === 'ar' ? 'طريقة الحساب' : 'Calculation', 
      accessorKey: 'calculation_method',
      cell: (row) => {
        if (row.calculation_method === 'fixed') {
          return formatNumber(row.default_value || 0);
        }
        return `${formatNumber(row.default_percentage || 0)}%`;
      }
    },
    { 
      header: language === 'ar' ? 'الحالة' : 'Status', 
      accessorKey: 'is_active',
      cell: (row) => (
        <Badge className={row.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
          {row.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
        </Badge>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader
        title={language === 'ar' ? 'بنود التكاليف غير المباشرة' : 'Indirect Cost Items'}
        onAdd={handleAdd}
        addLabel={language === 'ar' ? 'إضافة بند' : 'Add Item'}
      />

      <DataTable
        data={items}
        columns={columns}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={(item) => { setEditingItem(item); setDeleteOpen(true); }}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? (language === 'ar' ? 'تعديل البند' : 'Edit Item') : (language === 'ar' ? 'إضافة بند' : 'Add Item')}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الكود' : 'Code'} *</Label>
            <Input value={formData.item_code} onChange={(e) => setFormData({ ...formData, item_code: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} *</Label>
              <Input value={formData.item_name_ar} onChange={(e) => setFormData({ ...formData, item_name_ar: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} *</Label>
              <Input value={formData.item_name_en} onChange={(e) => setFormData({ ...formData, item_name_en: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع التكلفة' : 'Cost Type'}</Label>
              <Select value={formData.cost_type} onValueChange={(v) => setFormData({ ...formData, cost_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COST_TYPES.map(type => (
                    <SelectItem key={type.key} value={type.key}>{language === 'ar' ? type.ar : type.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'طريقة الحساب' : 'Calculation Method'}</Label>
              <Select value={formData.calculation_method} onValueChange={(v) => setFormData({ ...formData, calculation_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CALC_METHODS.map(method => (
                    <SelectItem key={method.key} value={method.key}>{language === 'ar' ? method.ar : method.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {formData.calculation_method === 'fixed' ? (
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'القيمة الافتراضية' : 'Default Value'}</Label>
                <Input type="number" value={formData.default_value} onChange={(e) => setFormData({ ...formData, default_value: parseFloat(e.target.value) })} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'النسبة الافتراضية %' : 'Default Percentage %'}</Label>
                <Input type="number" value={formData.default_percentage} onChange={(e) => setFormData({ ...formData, default_percentage: parseFloat(e.target.value) })} />
              </div>
            )}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'حساب الأستاذ' : 'GL Account'}</Label>
              <Select value={formData.gl_account_id} onValueChange={(v) => setFormData({ ...formData, gl_account_id: v })}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر الحساب' : 'Select Account'} /></SelectTrigger>
                <SelectContent>
                  {glAccounts.filter(a => a.allow_posting).map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.account_code} - {language === 'ar' ? acc.account_name_ar : acc.account_name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="is_active" checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} />
            <Label htmlFor="is_active">{language === 'ar' ? 'نشط' : 'Active'}</Label>
          </div>
        </div>
      </FormModal>

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate(editingItem?.id)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}