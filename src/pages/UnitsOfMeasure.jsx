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

const UOM_TYPES = [
  { key: 'quantity', ar: 'كمية', en: 'Quantity' },
  { key: 'length', ar: 'طول', en: 'Length' },
  { key: 'area', ar: 'مساحة', en: 'Area' },
  { key: 'volume', ar: 'حجم', en: 'Volume' },
  { key: 'weight', ar: 'وزن', en: 'Weight' },
  { key: 'time', ar: 'وقت', en: 'Time' },
];

const initialFormData = {
  uom_code: '',
  uom_name_ar: '',
  uom_name_en: '',
  uom_type: 'quantity',
  is_active: true
};

export default function UnitsOfMeasure() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: uoms = [], isLoading } = useQuery({
    queryKey: ['unitsOfMeasure', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.UnitOfMeasure.filter({ company_id: currentCompany.id }) : base44.entities.UnitOfMeasure.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.UnitOfMeasure.create({ ...data, company_id: currentCompany?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unitsOfMeasure'] });
      setModalOpen(false);
      toast.success(language === 'ar' ? 'تم الإنشاء بنجاح' : 'Created successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UnitOfMeasure.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unitsOfMeasure'] });
      setModalOpen(false);
      toast.success(language === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UnitOfMeasure.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unitsOfMeasure'] });
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
    { header: language === 'ar' ? 'الكود' : 'Code', accessorKey: 'uom_code' },
    { header: language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)', accessorKey: 'uom_name_ar' },
    { header: language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)', accessorKey: 'uom_name_en' },
    { 
      header: language === 'ar' ? 'النوع' : 'Type', 
      accessorKey: 'uom_type',
      cell: (row) => {
        const type = UOM_TYPES.find(t => t.key === row.uom_type);
        return <Badge variant="outline">{language === 'ar' ? type?.ar : type?.en}</Badge>;
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
        title={language === 'ar' ? 'وحدات القياس' : 'Units of Measure'}
        onAdd={handleAdd}
        addLabel={language === 'ar' ? 'إضافة وحدة' : 'Add UOM'}
      />

      <DataTable
        data={uoms}
        columns={columns}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={(item) => { setEditingItem(item); setDeleteOpen(true); }}
        searchable
        searchPlaceholder={language === 'ar' ? 'بحث...' : 'Search...'}
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? (language === 'ar' ? 'تعديل وحدة القياس' : 'Edit UOM') : (language === 'ar' ? 'إضافة وحدة قياس' : 'Add UOM')}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الكود' : 'Code'} *</Label>
            <Input value={formData.uom_code} onChange={(e) => setFormData({ ...formData, uom_code: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} *</Label>
              <Input value={formData.uom_name_ar} onChange={(e) => setFormData({ ...formData, uom_name_ar: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} *</Label>
              <Input value={formData.uom_name_en} onChange={(e) => setFormData({ ...formData, uom_name_en: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
            <Select value={formData.uom_type} onValueChange={(v) => setFormData({ ...formData, uom_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {UOM_TYPES.map(type => (
                  <SelectItem key={type.key} value={type.key}>{language === 'ar' ? type.ar : type.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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