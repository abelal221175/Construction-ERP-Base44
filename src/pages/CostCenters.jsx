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
  cost_center_code: '',
  name_ar: '',
  name_en: '',
  parent_cost_center_id: '',
  cost_center_type: 'project',
  responsible_employee_id: '',
  is_active: true,
};

const ccTypes = {
  ar: {
    project: 'مشروع',
    department: 'قسم',
    overhead: 'مصاريف عمومية',
  },
  en: {
    project: 'Project',
    department: 'Department',
    overhead: 'Overhead',
  }
};

export default function CostCenters() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: costCenters = [], isLoading } = useQuery({
    queryKey: ['costCenters', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.CostCenter.filter({ company_id: currentCompany.id })
      : base44.entities.CostCenter.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CostCenter.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCenters'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CostCenter.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCenters'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CostCenter.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCenters'] });
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

  const typeColors = {
    project: 'bg-blue-100 text-blue-700 border-blue-200',
    department: 'bg-purple-100 text-purple-700 border-purple-200',
    overhead: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  const columns = [
    {
      header: t('code'),
      accessor: 'cost_center_code',
      sortable: true,
    },
    {
      header: t('name'),
      accessor: 'name_ar',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium">
            {language === 'ar' ? row.name_ar : row.name_en}
          </p>
          <p className="text-sm text-slate-500">
            {language === 'ar' ? row.name_en : row.name_ar}
          </p>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'النوع' : 'Type',
      accessor: 'cost_center_type',
      render: (value) => (
        <Badge variant="outline" className={cn("border", typeColors[value])}>
          {ccTypes[language][value]}
        </Badge>
      ),
    },
    {
      header: language === 'ar' ? 'مركز التكلفة الأب' : 'Parent CC',
      accessor: 'parent_cost_center_id',
      render: (value) => {
        const parent = costCenters.find(c => c.id === value);
        return parent ? getLocalizedName(parent, language, 'name_ar', 'name_en') : '-';
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
        title={t('costCenters')}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'مركز تكلفة' : 'Cost Center'}`}
      />

      <DataTable
        columns={columns}
        data={costCenters}
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
              value={formData.cost_center_code}
              onChange={(e) => setFormData({ ...formData, cost_center_code: e.target.value })}
              placeholder="CC-001"
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'النوع' : 'Type'} *</Label>
            <Select
              value={formData.cost_center_type}
              onValueChange={(value) => setFormData({ ...formData, cost_center_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project">{ccTypes[language].project}</SelectItem>
                <SelectItem value="department">{ccTypes[language].department}</SelectItem>
                <SelectItem value="overhead">{ccTypes[language].overhead}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('nameAr')} *</Label>
            <Input
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('nameEn')} *</Label>
            <Input
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>{language === 'ar' ? 'مركز التكلفة الأب' : 'Parent Cost Center'}</Label>
            <Select
              value={formData.parent_cost_center_id}
              onValueChange={(value) => setFormData({ ...formData, parent_cost_center_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>{language === 'ar' ? 'بدون أب' : 'No Parent'}</SelectItem>
                {costCenters
                  .filter(c => c.id !== editingItem?.id)
                  .map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.cost_center_code} - {getLocalizedName(cc, language, 'name_ar', 'name_en')}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
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