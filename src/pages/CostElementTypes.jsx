import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/shared/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import ImportExportActions from '@/components/shared/ImportExportActions';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const MODULE_NAME = 'MODULE 04';
const ENTITY_NAME = 'CostElementType';

export default function CostElementTypes() {
  const { language, t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const { data: costElements = [], isLoading } = useQuery({
    queryKey: ['cost-element-types'],
    queryFn: () => base44.entities.CostElementType.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CostElementType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-element-types'] });
      toast.success(language === 'ar' ? 'تم الإنشاء بنجاح' : 'Created successfully');
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CostElementType.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-element-types'] });
      toast.success(language === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
      setShowForm(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CostElementType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-element-types'] });
      toast.success(language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
      setShowDelete(false);
    }
  });

  const columns = [
    { accessorKey: 'element_code', header: language === 'ar' ? 'الكود' : 'Code', headerAr: 'الكود', required: true },
    { accessorKey: 'element_name_ar', header: language === 'ar' ? 'الاسم بالعربية' : 'Name (AR)', headerAr: 'الاسم بالعربية', required: true },
    { accessorKey: 'element_name_en', header: language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (EN)', headerAr: 'الاسم بالإنجليزية', required: true },
    { accessorKey: 'sort_order', header: language === 'ar' ? 'الترتيب' : 'Sort Order', headerAr: 'الترتيب', type: 'number' },
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
      element_code: '',
      element_name_ar: '',
      element_name_en: '',
      sort_order: 0,
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
        title={language === 'ar' ? 'أنواع عناصر التكلفة' : 'Cost Element Types'}
        subtitle={language === 'ar' ? 'إدارة أنواع عناصر التكلفة (مواد، مقاولين، عمالة، معدات، غير مباشرة)' : 'Manage cost element types (Material, Subcontractor, Labor, Equipment, Indirect)'}
        onAdd={handleAdd}
        addLabel={language === 'ar' ? 'إضافة نوع' : 'Add Type'}
      >
        <ImportExportActions
          entityName={ENTITY_NAME}
          moduleName={MODULE_NAME}
          data={costElements}
          columns={columns}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['cost-element-types'] })}
        />
      </PageHeader>

      <DataTable
        data={costElements}
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
          ? (language === 'ar' ? 'تعديل نوع عنصر التكلفة' : 'Edit Cost Element Type')
          : (language === 'ar' ? 'إضافة نوع عنصر تكلفة جديد' : 'Add New Cost Element Type')}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الكود' : 'Code'} *</Label>
            <Input
              value={formData.element_code || ''}
              onChange={(e) => setFormData({ ...formData, element_code: e.target.value })}
              placeholder="e.g. material, labor"
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
              value={formData.element_name_ar || ''}
              onChange={(e) => setFormData({ ...formData, element_name_ar: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'} *</Label>
            <Input
              value={formData.element_name_en || ''}
              onChange={(e) => setFormData({ ...formData, element_name_en: e.target.value })}
            />
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
        title={language === 'ar' ? 'حذف نوع عنصر التكلفة' : 'Delete Cost Element Type'}
      />
    </div>
  );
}