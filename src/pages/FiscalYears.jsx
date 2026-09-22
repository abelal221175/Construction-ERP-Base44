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
import { formatDate } from '@/components/shared/formatters';

const MODULE_NAME = 'MODULE 03';
const ENTITY_NAME = 'FiscalYear';

export default function FiscalYears() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const { data: fiscalYears = [], isLoading } = useQuery({
    queryKey: ['fiscal-years', currentCompany?.id],
    queryFn: () => currentCompany?.id 
      ? base44.entities.FiscalYear.filter({ company_id: currentCompany.id })
      : base44.entities.FiscalYear.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FiscalYear.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success(language === 'ar' ? 'تم الإنشاء بنجاح' : 'Created successfully');
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FiscalYear.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success(language === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
      setShowForm(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FiscalYear.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success(language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
      setShowDelete(false);
    }
  });

  const columns = [
    { accessorKey: 'year_code', header: language === 'ar' ? 'كود السنة' : 'Year Code', headerAr: 'كود السنة', required: true },
    { accessorKey: 'year_name', header: language === 'ar' ? 'اسم السنة' : 'Year Name', headerAr: 'اسم السنة', required: true },
    { 
      accessorKey: 'start_date', 
      header: language === 'ar' ? 'تاريخ البداية' : 'Start Date', 
      headerAr: 'تاريخ البداية',
      type: 'date',
      cell: ({ row }) => formatDate(row.original.start_date)
    },
    { 
      accessorKey: 'end_date', 
      header: language === 'ar' ? 'تاريخ النهاية' : 'End Date', 
      headerAr: 'تاريخ النهاية',
      type: 'date',
      cell: ({ row }) => formatDate(row.original.end_date)
    },
    { 
      accessorKey: 'is_open', 
      header: language === 'ar' ? 'مفتوحة' : 'Open', 
      headerAr: 'مفتوحة',
      type: 'boolean',
      cell: ({ row }) => row.original.is_open ? '✓' : '✗'
    },
    { 
      accessorKey: 'is_current', 
      header: language === 'ar' ? 'الحالية' : 'Current', 
      headerAr: 'الحالية',
      type: 'boolean',
      cell: ({ row }) => row.original.is_current ? '✓' : '✗'
    }
  ];

  const handleAdd = () => {
    const year = new Date().getFullYear();
    setEditingItem(null);
    setFormData({
      company_id: currentCompany?.id || '',
      year_code: String(year),
      year_name: `Fiscal Year ${year}`,
      start_date: `${year}-01-01`,
      end_date: `${year}-12-31`,
      is_open: true,
      is_current: false
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

  return (
    <div className="space-y-4">
      <PageHeader
        title={language === 'ar' ? 'السنوات المالية' : 'Fiscal Years'}
        subtitle={language === 'ar' ? 'إدارة السنوات المالية' : 'Manage fiscal years'}
        onAdd={handleAdd}
        addLabel={language === 'ar' ? 'إضافة سنة مالية' : 'Add Fiscal Year'}
      >
        <ImportExportActions
          entityName={ENTITY_NAME}
          moduleName={MODULE_NAME}
          data={fiscalYears}
          columns={columns}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['fiscal-years'] })}
        />
      </PageHeader>

      <DataTable
        data={fiscalYears}
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
          ? (language === 'ar' ? 'تعديل السنة المالية' : 'Edit Fiscal Year')
          : (language === 'ar' ? 'إضافة سنة مالية جديدة' : 'Add New Fiscal Year')}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'كود السنة' : 'Year Code'} *</Label>
            <Input
              value={formData.year_code || ''}
              onChange={(e) => setFormData({ ...formData, year_code: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'اسم السنة' : 'Year Name'} *</Label>
            <Input
              value={formData.year_name || ''}
              onChange={(e) => setFormData({ ...formData, year_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'تاريخ البداية' : 'Start Date'} *</Label>
            <Input
              type="date"
              value={formData.start_date || ''}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'تاريخ النهاية' : 'End Date'} *</Label>
            <Input
              type="date"
              value={formData.end_date || ''}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_open ?? true}
              onCheckedChange={(checked) => setFormData({ ...formData, is_open: checked })}
            />
            <Label>{language === 'ar' ? 'السنة مفتوحة' : 'Year is Open'}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_current ?? false}
              onCheckedChange={(checked) => setFormData({ ...formData, is_current: checked })}
            />
            <Label>{language === 'ar' ? 'السنة الحالية' : 'Current Year'}</Label>
          </div>
        </div>
      </FormModal>

      <DeleteConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={() => deleteMutation.mutate(editingItem?.id)}
        isDeleting={deleteMutation.isPending}
        title={language === 'ar' ? 'حذف السنة المالية' : 'Delete Fiscal Year'}
      />
    </div>
  );
}