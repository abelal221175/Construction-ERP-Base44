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

const DOCUMENT_TYPES = [
  { key: 'PR', ar: 'طلب شراء', en: 'Purchase Requisition' },
  { key: 'PO', ar: 'أمر شراء', en: 'Purchase Order' },
  { key: 'GRN', ar: 'إذن استلام', en: 'Goods Received Note' },
  { key: 'PV', ar: 'سند صرف', en: 'Payment Voucher' },
  { key: 'RV', ar: 'سند قبض', en: 'Receipt Voucher' },
  { key: 'JE', ar: 'قيد يومية', en: 'Journal Entry' },
  { key: 'IPC', ar: 'مستخلص', en: 'IPC' },
  { key: 'SC', ar: 'عقد باطن', en: 'Subcontract' },
  { key: 'VO', ar: 'أمر تغيير', en: 'Variation Order' },
  { key: 'LG', ar: 'خطاب ضمان', en: 'Letter of Guarantee' },
  { key: 'RFQ', ar: 'طلب عرض سعر', en: 'RFQ' },
];

const RESET_PERIODS = [
  { key: 'never', ar: 'لا يتم إعادة ضبط', en: 'Never' },
  { key: 'yearly', ar: 'سنوي', en: 'Yearly' },
  { key: 'monthly', ar: 'شهري', en: 'Monthly' },
];

const initialFormData = {
  document_type: '',
  prefix: '',
  suffix: '',
  current_number: 0,
  number_length: 4,
  reset_period: 'yearly',
  is_active: true
};

export default function NumberingSeries() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: series = [], isLoading } = useQuery({
    queryKey: ['numberingSeries', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.NumberingSeries.filter({ company_id: currentCompany.id }) : [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.NumberingSeries.create({ ...data, company_id: currentCompany?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numberingSeries'] });
      setModalOpen(false);
      toast.success(language === 'ar' ? 'تم الإنشاء بنجاح' : 'Created successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.NumberingSeries.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numberingSeries'] });
      setModalOpen(false);
      toast.success(language === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NumberingSeries.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numberingSeries'] });
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

  const getNextNumber = (row) => {
    const next = row.current_number + 1;
    const padded = String(next).padStart(row.number_length, '0');
    return `${row.prefix || ''}${padded}${row.suffix || ''}`;
  };

  const columns = [
    { 
      header: language === 'ar' ? 'نوع المستند' : 'Document Type', 
      accessorKey: 'document_type',
      cell: (row) => {
        const type = DOCUMENT_TYPES.find(t => t.key === row.document_type);
        return <Badge variant="outline">{language === 'ar' ? type?.ar : type?.en || row.document_type}</Badge>;
      }
    },
    { header: language === 'ar' ? 'البادئة' : 'Prefix', accessorKey: 'prefix' },
    { header: language === 'ar' ? 'اللاحقة' : 'Suffix', accessorKey: 'suffix' },
    { header: language === 'ar' ? 'الرقم الحالي' : 'Current No.', accessorKey: 'current_number' },
    { header: language === 'ar' ? 'الرقم التالي' : 'Next Number', accessorKey: 'next', cell: (row) => <span className="font-mono">{getNextNumber(row)}</span> },
    { 
      header: language === 'ar' ? 'إعادة الضبط' : 'Reset', 
      accessorKey: 'reset_period',
      cell: (row) => {
        const period = RESET_PERIODS.find(p => p.key === row.reset_period);
        return language === 'ar' ? period?.ar : period?.en;
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
        title={language === 'ar' ? 'تسلسل الترقيم' : 'Numbering Series'}
        subtitle={language === 'ar' ? 'إعداد تسلسل أرقام المستندات' : 'Configure document numbering sequences'}
        onAdd={handleAdd}
        addLabel={language === 'ar' ? 'إضافة تسلسل' : 'Add Series'}
      />

      <DataTable
        data={series}
        columns={columns}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={(item) => { setEditingItem(item); setDeleteOpen(true); }}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? (language === 'ar' ? 'تعديل التسلسل' : 'Edit Series') : (language === 'ar' ? 'إضافة تسلسل' : 'Add Series')}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'نوع المستند' : 'Document Type'} *</Label>
            <Select value={formData.document_type} onValueChange={(v) => setFormData({ ...formData, document_type: v })}>
              <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر النوع' : 'Select Type'} /></SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type.key} value={type.key}>{language === 'ar' ? type.ar : type.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'البادئة' : 'Prefix'}</Label>
              <Input value={formData.prefix} onChange={(e) => setFormData({ ...formData, prefix: e.target.value })} placeholder="PR-" />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اللاحقة' : 'Suffix'}</Label>
              <Input value={formData.suffix} onChange={(e) => setFormData({ ...formData, suffix: e.target.value })} placeholder="-2024" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الرقم الحالي' : 'Current Number'}</Label>
              <Input type="number" min="0" value={formData.current_number} onChange={(e) => setFormData({ ...formData, current_number: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'طول الرقم' : 'Number Length'}</Label>
              <Input type="number" min="1" max="10" value={formData.number_length} onChange={(e) => setFormData({ ...formData, number_length: parseInt(e.target.value) || 4 })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'فترة إعادة الضبط' : 'Reset Period'}</Label>
            <Select value={formData.reset_period} onValueChange={(v) => setFormData({ ...formData, reset_period: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESET_PERIODS.map(period => (
                  <SelectItem key={period.key} value={period.key}>{language === 'ar' ? period.ar : period.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <Label className="text-sm text-slate-600">{language === 'ar' ? 'معاينة الرقم التالي:' : 'Next Number Preview:'}</Label>
            <div className="font-mono text-lg mt-1">
              {formData.prefix}{String((formData.current_number || 0) + 1).padStart(formData.number_length || 4, '0')}{formData.suffix}
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