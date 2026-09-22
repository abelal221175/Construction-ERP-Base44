import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { getLocalizedName } from '@/components/shared/formatters';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const initialFormData = {
  department_code: '',
  department_name_ar: '',
  department_name_en: '',
  parent_department_id: '',
  manager_id: '',
  is_active: true,
};

export default function Departments() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Department.filter({ company_id: currentCompany.id })
      : base44.entities.Department.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Department.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Department.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Department.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setDeleteOpen(false);
      toast.success(t('deletedSuccessfully'));
    },
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ ...initialFormData, company_id: currentCompany?.id });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...initialFormData, ...item });
    setModalOpen(true);
  };

  const handleDelete = (item) => {
    setEditingItem(item);
    setDeleteOpen(true);
  };

  const handleSave = () => {
    const dataToSave = {
      ...formData,
      company_id: currentCompany?.id,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const columns = [
    {
      header: t('code'),
      accessor: 'department_code',
      sortable: true,
    },
    {
      header: t('name'),
      accessor: 'department_name_ar',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium">
            {language === 'ar' ? row.department_name_ar : row.department_name_en}
          </p>
          <p className="text-sm text-slate-500">
            {language === 'ar' ? row.department_name_en : row.department_name_ar}
          </p>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'القسم الأب' : 'Parent Dept.',
      accessor: 'parent_department_id',
      render: (value) => {
        const parent = departments.find(d => d.id === value);
        return parent ? getLocalizedName(parent, language, 'department_name_ar', 'department_name_en') : '-';
      },
    },
    {
      header: t('status'),
      accessor: 'is_active',
      render: (value) => (
        <Badge variant="outline" className={cn(
          "border",
          value ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"
        )}>
          {value ? t('active') : t('inactive')}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('departments')}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'قسم' : 'Department'}`}
      />

      <DataTable
        columns={columns}
        data={departments}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `${t('edit')}` : `${t('add')}`}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="md"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('code')} *</Label>
            <Input
              value={formData.department_code}
              onChange={(e) => setFormData({ ...formData, department_code: e.target.value })}
              placeholder="DEPT-001"
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'القسم الأب' : 'Parent Dept.'}</Label>
            <Select
              value={formData.parent_department_id}
              onValueChange={(value) => setFormData({ ...formData, parent_department_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>{language === 'ar' ? 'بدون أب' : 'No Parent'}</SelectItem>
                {departments
                  .filter(d => d.id !== editingItem?.id)
                  .map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {getLocalizedName(dept, language, 'department_name_ar', 'department_name_en')}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('nameAr')} *</Label>
            <Input
              value={formData.department_name_ar}
              onChange={(e) => setFormData({ ...formData, department_name_ar: e.target.value })}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('nameEn')} *</Label>
            <Input
              value={formData.department_name_en}
              onChange={(e) => setFormData({ ...formData, department_name_en: e.target.value })}
            />
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