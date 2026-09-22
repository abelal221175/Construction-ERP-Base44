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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const MODULE_NAME = 'MODULE 01';
const ENTITY_NAME = 'SystemSetting';

export default function SystemSettings() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['system-settings', currentCompany?.id],
    queryFn: () => currentCompany?.id 
      ? base44.entities.SystemSetting.filter({ company_id: currentCompany.id })
      : base44.entities.SystemSetting.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SystemSetting.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success(language === 'ar' ? 'تم الإنشاء بنجاح' : 'Created successfully');
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SystemSetting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success(language === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
      setShowForm(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SystemSetting.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success(language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
      setShowDelete(false);
    }
  });

  const columns = [
    { accessorKey: 'setting_key', header: language === 'ar' ? 'المفتاح' : 'Key', headerAr: 'المفتاح', required: true },
    { accessorKey: 'setting_value', header: language === 'ar' ? 'القيمة' : 'Value', headerAr: 'القيمة' },
    { accessorKey: 'setting_type', header: language === 'ar' ? 'النوع' : 'Type', headerAr: 'النوع' },
    { accessorKey: 'description_ar', header: language === 'ar' ? 'الوصف بالعربية' : 'Description (AR)', headerAr: 'الوصف بالعربية' },
    { accessorKey: 'description_en', header: language === 'ar' ? 'الوصف بالإنجليزية' : 'Description (EN)', headerAr: 'الوصف بالإنجليزية' },
    { 
      accessorKey: 'is_system', 
      header: language === 'ar' ? 'نظام' : 'System', 
      headerAr: 'نظام',
      type: 'boolean',
      cell: ({ row }) => row.original.is_system ? '✓' : '✗'
    }
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      company_id: currentCompany?.id || '',
      setting_key: '',
      setting_value: '',
      setting_type: 'string',
      description_ar: '',
      description_en: '',
      is_system: false,
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

  return (
    <div className="space-y-4">
      <PageHeader
        title={language === 'ar' ? 'إعدادات النظام' : 'System Settings'}
        subtitle={language === 'ar' ? 'إدارة إعدادات النظام والشركة' : 'Manage system and company settings'}
        onAdd={handleAdd}
        addLabel={language === 'ar' ? 'إضافة إعداد' : 'Add Setting'}
      >
        <ImportExportActions
          entityName={ENTITY_NAME}
          moduleName={MODULE_NAME}
          data={settings}
          columns={columns}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['system-settings'] })}
        />
      </PageHeader>

      <DataTable
        data={settings}
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
          ? (language === 'ar' ? 'تعديل الإعداد' : 'Edit Setting')
          : (language === 'ar' ? 'إضافة إعداد جديد' : 'Add New Setting')}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المفتاح' : 'Setting Key'} *</Label>
            <Input
              value={formData.setting_key || ''}
              onChange={(e) => setFormData({ ...formData, setting_key: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
            <Select
              value={formData.setting_type || 'string'}
              onValueChange={(value) => setFormData({ ...formData, setting_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">{language === 'ar' ? 'نص' : 'String'}</SelectItem>
                <SelectItem value="number">{language === 'ar' ? 'رقم' : 'Number'}</SelectItem>
                <SelectItem value="boolean">{language === 'ar' ? 'منطقي' : 'Boolean'}</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>{language === 'ar' ? 'القيمة' : 'Value'}</Label>
            <Textarea
              value={formData.setting_value || ''}
              onChange={(e) => setFormData({ ...formData, setting_value: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الوصف بالعربية' : 'Description (Arabic)'}</Label>
            <Input
              value={formData.description_ar || ''}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الوصف بالإنجليزية' : 'Description (English)'}</Label>
            <Input
              value={formData.description_en || ''}
              onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_system ?? false}
              onCheckedChange={(checked) => setFormData({ ...formData, is_system: checked })}
            />
            <Label>{language === 'ar' ? 'إعداد نظام' : 'System Setting'}</Label>
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
        title={language === 'ar' ? 'حذف الإعداد' : 'Delete Setting'}
      />
    </div>
  );
}