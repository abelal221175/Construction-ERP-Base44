import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import ImportExportActions from '@/components/shared/ImportExportActions';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const MODULE_NAME = 'MODULE 01';
const ENTITY_NAME = 'SystemSequence';

export default function SystemSequences() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['system-sequences', currentCompany?.id],
    queryFn: () => currentCompany?.id 
      ? base44.entities.SystemSequence.filter({ company_id: currentCompany.id })
      : base44.entities.SystemSequence.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SystemSequence.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-sequences'] });
      toast.success(language === 'ar' ? 'تم الإنشاء بنجاح' : 'Created successfully');
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SystemSequence.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-sequences'] });
      toast.success(language === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
      setShowForm(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SystemSequence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-sequences'] });
      toast.success(language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
      setShowDelete(false);
    }
  });

  const columns = [
    { accessorKey: 'sequence_type', header: language === 'ar' ? 'نوع التسلسل' : 'Sequence Type', headerAr: 'نوع التسلسل', required: true },
    { accessorKey: 'fiscal_year', header: language === 'ar' ? 'السنة المالية' : 'Fiscal Year', headerAr: 'السنة المالية', type: 'number', required: true },
    { accessorKey: 'prefix', header: language === 'ar' ? 'البادئة' : 'Prefix', headerAr: 'البادئة' },
    { accessorKey: 'current_number', header: language === 'ar' ? 'الرقم الحالي' : 'Current Number', headerAr: 'الرقم الحالي', type: 'number' },
    { accessorKey: 'number_format', header: language === 'ar' ? 'صيغة الترقيم' : 'Format', headerAr: 'صيغة الترقيم' },
    { 
      accessorKey: 'is_active', 
      header: language === 'ar' ? 'نشط' : 'Active', 
      headerAr: 'نشط',
      type: 'boolean',
      cell: ({ row }) => row.original.is_active ? '✓' : '✗'
    }
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      company_id: currentCompany?.id || '',
      sequence_type: '',
      fiscal_year: new Date().getFullYear(),
      prefix: '',
      current_number: 0,
      number_format: '{PREFIX}-{YEAR}-{SEQ:4}',
      is_active: true
    });
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowForm(true);
  };

  const handleSave = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (item) => {
    setEditingItem(item);
    setShowDelete(true);
  };

  const sequenceTypes = [
    { value: 'PR', label: language === 'ar' ? 'طلب شراء' : 'Purchase Requisition' },
    { value: 'PO', label: language === 'ar' ? 'أمر شراء' : 'Purchase Order' },
    { value: 'GRN', label: language === 'ar' ? 'إذن استلام' : 'Goods Received Note' },
    { value: 'INV', label: language === 'ar' ? 'فاتورة' : 'Invoice' },
    { value: 'IPC', label: language === 'ar' ? 'مستخلص' : 'IPC' },
    { value: 'JE', label: language === 'ar' ? 'قيد يومية' : 'Journal Entry' },
    { value: 'PV', label: language === 'ar' ? 'سند صرف' : 'Payment Voucher' },
    { value: 'RV', label: language === 'ar' ? 'سند قبض' : 'Receipt Voucher' },
    { value: 'SC', label: language === 'ar' ? 'عقد باطن' : 'Subcontract' },
    { value: 'RFQ', label: language === 'ar' ? 'طلب عرض سعر' : 'RFQ' }
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={language === 'ar' ? 'تسلسل الترقيم' : 'Document Numbering'}
        subtitle={language === 'ar' ? 'إدارة تسلسل ترقيم المستندات' : 'Manage document numbering sequences'}
        onAdd={handleAdd}
        addLabel={language === 'ar' ? 'إضافة تسلسل' : 'Add Sequence'}
      >
        <ImportExportActions
          entityName={ENTITY_NAME}
          moduleName={MODULE_NAME}
          data={sequences}
          columns={columns}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['system-sequences'] })}
        />
      </PageHeader>

      <DataTable
        data={sequences}
        columns={columns}
        isLoading={isLoading}
        onRowClick={handleEdit}
        actions={[
          { label: language === 'ar' ? 'تعديل' : 'Edit', onClick: handleEdit },
          { label: language === 'ar' ? 'حذف' : 'Delete', onClick: handleDelete, variant: 'destructive' }
        ]}
      />

      <FormModal
        open={showForm}
        onOpenChange={setShowForm}
        title={editingItem 
          ? (language === 'ar' ? 'تعديل التسلسل' : 'Edit Sequence')
          : (language === 'ar' ? 'إضافة تسلسل جديد' : 'Add New Sequence')}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'نوع التسلسل' : 'Sequence Type'} *</Label>
            <Input
              value={formData.sequence_type || ''}
              onChange={(e) => setFormData({ ...formData, sequence_type: e.target.value })}
              placeholder="e.g. PR, PO, GRN"
              list="sequence-types"
            />
            <datalist id="sequence-types">
              {sequenceTypes.map(st => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'السنة المالية' : 'Fiscal Year'} *</Label>
            <Input
              type="number"
              value={formData.fiscal_year || new Date().getFullYear()}
              onChange={(e) => setFormData({ ...formData, fiscal_year: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'البادئة' : 'Prefix'}</Label>
            <Input
              value={formData.prefix || ''}
              onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الرقم الحالي' : 'Current Number'}</Label>
            <Input
              type="number"
              value={formData.current_number || 0}
              onChange={(e) => setFormData({ ...formData, current_number: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>{language === 'ar' ? 'صيغة الترقيم' : 'Number Format'}</Label>
            <Input
              value={formData.number_format || '{PREFIX}-{YEAR}-{SEQ:4}'}
              onChange={(e) => setFormData({ ...formData, number_format: e.target.value })}
              placeholder="{PREFIX}-{YEAR}-{SEQ:4}"
            />
            <p className="text-xs text-slate-500">
              {language === 'ar' 
                ? 'المتغيرات: {PREFIX}, {YEAR}, {SEQ:n} حيث n = عدد الأرقام'
                : 'Variables: {PREFIX}, {YEAR}, {SEQ:n} where n = number of digits'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_active ?? true}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label>{language === 'ar' ? 'نشط' : 'Active'}</Label>
          </div>
        </div>
      </FormModal>

      <DeleteConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={() => deleteMutation.mutate(editingItem?.id)}
        isDeleting={deleteMutation.isPending}
        title={language === 'ar' ? 'حذف التسلسل' : 'Delete Sequence'}
      />
    </div>
  );
}