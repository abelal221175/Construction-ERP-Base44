import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import ImportExportActions from '@/components/shared/ImportExportActions';
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

const MODULE_NAME = 'MODULE 06';
const ENTITY_NAME = 'Warehouse';

const initialFormData = {
  warehouse_code: '',
  warehouse_name_ar: '',
  warehouse_name_en: '',
  project_id: '',
  warehouse_type: 'main',
  location_ar: '',
  location_en: '',
  custodian_id: '',
  is_active: true,
};

const warehouseTypes = {
  ar: {
    main: 'مخزن رئيسي',
    site: 'مخزن موقع',
    transit: 'مخزن ترانزيت',
  },
  en: {
    main: 'Main Warehouse',
    site: 'Site Warehouse',
    transit: 'Transit Warehouse',
  }
};

export default function Warehouses() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Warehouse.filter({ company_id: currentCompany.id })
      : base44.entities.Warehouse.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Project.filter({ company_id: currentCompany.id })
      : base44.entities.Project.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Warehouse.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Warehouse.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Warehouse.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
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
    main: 'bg-blue-100 text-blue-700 border-blue-200',
    site: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    transit: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  const exportColumns = [
    { accessorKey: 'warehouse_code', header: language === 'ar' ? 'الكود' : 'Code', headerAr: 'الكود', required: true },
    { accessorKey: 'warehouse_name_ar', header: language === 'ar' ? 'الاسم بالعربية' : 'Name (AR)', headerAr: 'الاسم بالعربية', required: true },
    { accessorKey: 'warehouse_name_en', header: language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (EN)', headerAr: 'الاسم بالإنجليزية', required: true },
    { accessorKey: 'warehouse_type', header: language === 'ar' ? 'النوع' : 'Type', headerAr: 'النوع' },
    { accessorKey: 'address_ar', header: language === 'ar' ? 'العنوان بالعربية' : 'Address (AR)', headerAr: 'العنوان بالعربية' },
    { accessorKey: 'address_en', header: language === 'ar' ? 'العنوان بالإنجليزية' : 'Address (EN)', headerAr: 'العنوان بالإنجليزية' },
    { accessorKey: 'location_ar', header: language === 'ar' ? 'الموقع بالعربية' : 'Location (AR)', headerAr: 'الموقع بالعربية' },
    { accessorKey: 'location_en', header: language === 'ar' ? 'الموقع بالإنجليزية' : 'Location (EN)', headerAr: 'الموقع بالإنجليزية' },
    { accessorKey: 'is_active', header: language === 'ar' ? 'نشط' : 'Active', headerAr: 'نشط', type: 'boolean' }
  ];

  const columns = [
    {
      header: t('code'),
      accessor: 'warehouse_code',
      sortable: true,
    },
    {
      header: t('name'),
      accessor: 'warehouse_name_ar',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium">
            {language === 'ar' ? row.warehouse_name_ar : row.warehouse_name_en}
          </p>
          <p className="text-sm text-slate-500">
            {language === 'ar' ? row.location_ar : row.location_en}
          </p>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'النوع' : 'Type',
      accessor: 'warehouse_type',
      render: (value) => (
        <Badge variant="outline" className={cn("border", typeColors[value])}>
          {warehouseTypes[language][value]}
        </Badge>
      ),
    },
    {
      header: t('project'),
      accessor: 'project_id',
      render: (value) => {
        const project = projects.find(p => p.id === value);
        return project ? project.project_code : '-';
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
        title={t('warehouses')}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'مخزن' : 'Warehouse'}`}
      >
        <ImportExportActions
          entityName={ENTITY_NAME}
          moduleName={MODULE_NAME}
          data={warehouses}
          columns={exportColumns}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['warehouses'] })}
        />
      </PageHeader>

      <DataTable
        columns={columns}
        data={warehouses}
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
              value={formData.warehouse_code}
              onChange={(e) => setFormData({ ...formData, warehouse_code: e.target.value })}
              placeholder="WH-001"
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'النوع' : 'Type'} *</Label>
            <Select
              value={formData.warehouse_type}
              onValueChange={(value) => setFormData({ ...formData, warehouse_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">{warehouseTypes[language].main}</SelectItem>
                <SelectItem value="site">{warehouseTypes[language].site}</SelectItem>
                <SelectItem value="transit">{warehouseTypes[language].transit}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('nameAr')} *</Label>
            <Input
              value={formData.warehouse_name_ar}
              onChange={(e) => setFormData({ ...formData, warehouse_name_ar: e.target.value })}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('nameEn')} *</Label>
            <Input
              value={formData.warehouse_name_en}
              onChange={(e) => setFormData({ ...formData, warehouse_name_en: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الموقع (عربي)' : 'Location (AR)'}</Label>
            <Input
              value={formData.location_ar}
              onChange={(e) => setFormData({ ...formData, location_ar: e.target.value })}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الموقع (إنجليزي)' : 'Location (EN)'}</Label>
            <Input
              value={formData.location_en}
              onChange={(e) => setFormData({ ...formData, location_en: e.target.value })}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>{t('project')}</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>{language === 'ar' ? 'بدون مشروع' : 'No Project'}</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_code} - {getLocalizedName(project, language, 'project_name_ar', 'project_name_en')}
                  </SelectItem>
                ))}
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