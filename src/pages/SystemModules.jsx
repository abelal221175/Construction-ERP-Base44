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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const MODULE_NAME = 'MODULE 02';
const ENTITY_NAME = 'SystemModule';

export default function SystemModules() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['system-modules'],
    queryFn: () => base44.entities.SystemModule.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SystemModule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-modules'] });
      toast.success(language === 'ar' ? 'تم الإنشاء بنجاح' : 'Created successfully');
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SystemModule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-modules'] });
      toast.success(language === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
      setShowForm(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SystemModule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-modules'] });
      toast.success(language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
      setShowDelete(false);
    }
  });

  const columns = [
    { accessorKey: 'module_code', header: language === 'ar' ? 'الكود' : 'Code', headerAr: 'الكود', required: true },
    { accessorKey: 'module_name_ar', header: language === 'ar' ? 'الاسم بالعربية' : 'Name (AR)', headerAr: 'الاسم بالعربية', required: true },
    { accessorKey: 'module_name_en', header: language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (EN)', headerAr: 'الاسم بالإنجليزية', required: true },
    { accessorKey: 'route_path', header: language === 'ar' ? 'المسار' : 'Route', headerAr: 'المسار' },
    { accessorKey: 'icon', header: language === 'ar' ? 'الأيقونة' : 'Icon', headerAr: 'الأيقونة' },
    { accessorKey: 'sort_order', header: language === 'ar' ? 'الترتيب' : 'Order', headerAr: 'الترتيب', type: 'number' },
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
      module_code: '',
      module_name_ar: '',
      module_name_en: '',
      parent_module_id: '',
      sort_order: 0,
      icon: '',
      route_path: '',
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
        title={language === 'ar' ? 'وحدات النظام' : 'System Modules'}
        subtitle={language === 'ar' ? 'إدارة وحدات وقوائم النظام' : 'Manage system modules and menus'}
        onAdd={handleAdd}
        addLabel={language === 'ar' ? 'إضافة وحدة' : 'Add Module'}
      >
        <ImportExportActions
          entityName={ENTITY_NAME}
          moduleName={MODULE_NAME}
          data={modules}
          columns={columns}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['system-modules'] })}
        />
      </PageHeader>

      <DataTable
        data={modules}
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
          ? (language === 'ar' ? 'تعديل الوحدة' : 'Edit Module')
          : (language === 'ar' ? 'إضافة وحدة جديدة' : 'Add New Module')}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الكود' : 'Code'} *</Label>
            <Input
              value={formData.module_code || ''}
              onChange={(e) => setFormData({ ...formData, module_code: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الترتيب' : 'Sort Order'}</Label>
            <Input
              type="number"
              value={formData.sort_order || 0}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'} *</Label>
            <Input
              value={formData.module_name_ar || ''}
              onChange={(e) => setFormData({ ...formData, module_name_ar: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'} *</Label>
            <Input
              value={formData.module_name_en || ''}
              onChange={(e) => setFormData({ ...formData, module_name_en: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المسار' : 'Route Path'}</Label>
            <Input
              value={formData.route_path || ''}
              onChange={(e) => setFormData({ ...formData, route_path: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الأيقونة' : 'Icon'}</Label>
            <Input
              value={formData.icon || ''}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="e.g. Home, Settings"
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الوحدة الأم' : 'Parent Module'}</Label>
            <Select
              value={formData.parent_module_id || ''}
              onValueChange={(value) => setFormData({ ...formData, parent_module_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر الوحدة الأم' : 'Select parent'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                {modules.filter(m => m.id !== editingItem?.id).map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {language === 'ar' ? m.module_name_ar : m.module_name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-6">
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
        title={language === 'ar' ? 'حذف الوحدة' : 'Delete Module'}
      />
    </div>
  );
}