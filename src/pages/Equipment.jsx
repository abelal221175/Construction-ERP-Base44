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
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, getLocalizedName } from '@/components/shared/formatters';
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

const MODULE_NAME = 'MODULE 08';
const ENTITY_NAME = 'Equipment';

const initialFormData = {
  equipment_code: '',
  equipment_name_ar: '',
  equipment_name_en: '',
  equipment_type: '',
  ownership_type: 'owned',
  daily_rental_rate: '',
  hourly_rental_rate: '',
  monthly_rental_rate: '',
  status: 'available',
  current_project_id: '',
};

export default function Equipment() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Equipment.filter({ company_id: currentCompany.id })
      : base44.entities.Equipment.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Project.filter({ company_id: currentCompany.id })
      : base44.entities.Project.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Equipment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Equipment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
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

  const statusColors = {
    available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    in_use: 'bg-blue-100 text-blue-700 border-blue-200',
    maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
    retired: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const exportColumns = [
    { accessorKey: 'equipment_code', header: language === 'ar' ? 'الكود' : 'Code', headerAr: 'الكود', required: true },
    { accessorKey: 'equipment_name_ar', header: language === 'ar' ? 'الاسم بالعربية' : 'Name (AR)', headerAr: 'الاسم بالعربية', required: true },
    { accessorKey: 'equipment_name_en', header: language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (EN)', headerAr: 'الاسم بالإنجليزية', required: true },
    { accessorKey: 'equipment_type', header: language === 'ar' ? 'النوع' : 'Type', headerAr: 'النوع' },
    { accessorKey: 'ownership_type', header: language === 'ar' ? 'الملكية' : 'Ownership', headerAr: 'الملكية' },
    { accessorKey: 'brand', header: language === 'ar' ? 'العلامة' : 'Brand', headerAr: 'العلامة' },
    { accessorKey: 'model', header: language === 'ar' ? 'الموديل' : 'Model', headerAr: 'الموديل' },
    { accessorKey: 'serial_number', header: language === 'ar' ? 'الرقم التسلسلي' : 'Serial Number', headerAr: 'الرقم التسلسلي' },
    { accessorKey: 'year_of_manufacture', header: language === 'ar' ? 'سنة الصنع' : 'Year of Manufacture', headerAr: 'سنة الصنع', type: 'number' },
    { accessorKey: 'hourly_rental_rate', header: language === 'ar' ? 'الإيجار بالساعة' : 'Hourly Rate', headerAr: 'الإيجار بالساعة', type: 'number' },
    { accessorKey: 'daily_rental_rate', header: language === 'ar' ? 'الإيجار اليومي' : 'Daily Rate', headerAr: 'الإيجار اليومي', type: 'number' },
    { accessorKey: 'monthly_rental_rate', header: language === 'ar' ? 'الإيجار الشهري' : 'Monthly Rate', headerAr: 'الإيجار الشهري', type: 'number' },
    { accessorKey: 'status', header: language === 'ar' ? 'الحالة' : 'Status', headerAr: 'الحالة' },
    { accessorKey: 'is_active', header: language === 'ar' ? 'نشط' : 'Active', headerAr: 'نشط', type: 'boolean' }
  ];

  const columns = [
    {
      header: t('code'),
      accessor: 'equipment_code',
      sortable: true,
    },
    {
      header: t('name'),
      accessor: 'equipment_name_ar',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium">
            {language === 'ar' ? row.equipment_name_ar : row.equipment_name_en}
          </p>
          <p className="text-sm text-slate-500">
            {row.equipment_type}
          </p>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'الملكية' : 'Ownership',
      accessor: 'ownership_type',
      render: (value) => (
        <Badge variant="outline" className="border">
          {value === 'owned' 
            ? (language === 'ar' ? 'مملوك' : 'Owned')
            : (language === 'ar' ? 'مؤجر' : 'Rented')
          }
        </Badge>
      ),
    },
    {
      header: language === 'ar' ? 'الإيجار اليومي' : 'Daily Rate',
      accessor: 'daily_rental_rate',
      render: (value) => formatCurrency(value, 'EGP'),
    },
    {
      header: t('project'),
      accessor: 'current_project_id',
      render: (value) => {
        const project = projects.find(p => p.id === value);
        return project ? project.project_code : '-';
      },
    },
    {
      header: t('status'),
      accessor: 'status',
      render: (value) => (
        <Badge variant="outline" className={cn("border capitalize", statusColors[value])}>
          {value?.replace('_', ' ')}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('equipment')}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'معدة' : 'Equipment'}`}
      >
        <ImportExportActions
          entityName={ENTITY_NAME}
          moduleName={MODULE_NAME}
          data={equipment}
          columns={exportColumns}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['equipment'] })}
        />
      </PageHeader>

      <DataTable
        columns={columns}
        data={equipment}
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
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('code')} *</Label>
            <Input
              value={formData.equipment_code}
              onChange={(e) => setFormData({ ...formData, equipment_code: e.target.value })}
              placeholder="EQP-001"
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
            <Input
              value={formData.equipment_type}
              onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
              placeholder={language === 'ar' ? 'حفار، لودر، إلخ' : 'Excavator, Loader, etc'}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('nameAr')} *</Label>
            <Input
              value={formData.equipment_name_ar}
              onChange={(e) => setFormData({ ...formData, equipment_name_ar: e.target.value })}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('nameEn')} *</Label>
            <Input
              value={formData.equipment_name_en}
              onChange={(e) => setFormData({ ...formData, equipment_name_en: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الملكية' : 'Ownership'} *</Label>
            <Select
              value={formData.ownership_type}
              onValueChange={(value) => setFormData({ ...formData, ownership_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owned">{language === 'ar' ? 'مملوك' : 'Owned'}</SelectItem>
                <SelectItem value="rented">{language === 'ar' ? 'مؤجر' : 'Rented'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('status')}</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">{language === 'ar' ? 'متاح' : 'Available'}</SelectItem>
                <SelectItem value="in_use">{language === 'ar' ? 'قيد الاستخدام' : 'In Use'}</SelectItem>
                <SelectItem value="maintenance">{language === 'ar' ? 'صيانة' : 'Maintenance'}</SelectItem>
                <SelectItem value="retired">{language === 'ar' ? 'متقاعد' : 'Retired'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الإيجار بالساعة' : 'Hourly Rate'}</Label>
            <Input
              type="number"
              value={formData.hourly_rental_rate}
              onChange={(e) => setFormData({ ...formData, hourly_rental_rate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الإيجار اليومي' : 'Daily Rate'}</Label>
            <Input
              type="number"
              value={formData.daily_rental_rate}
              onChange={(e) => setFormData({ ...formData, daily_rental_rate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الإيجار الشهري' : 'Monthly Rate'}</Label>
            <Input
              type="number"
              value={formData.monthly_rental_rate}
              onChange={(e) => setFormData({ ...formData, monthly_rental_rate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المشروع الحالي' : 'Current Project'}</Label>
            <Select
              value={formData.current_project_id}
              onValueChange={(value) => setFormData({ ...formData, current_project_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>{language === 'ar' ? 'بدون مشروع' : 'No Project'}</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_code}
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