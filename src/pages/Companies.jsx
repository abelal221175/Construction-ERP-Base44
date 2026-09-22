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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MODULE_NAME = 'MODULE 01';
const ENTITY_NAME = 'Company';

const initialFormData = {
  company_code: '',
  company_name_ar: '',
  company_name_en: '',
  tax_id: '',
  commercial_register: '',
  base_currency: 'EGP',
  fiscal_year_start: 1,
  address_ar: '',
  address_en: '',
  phone: '',
  email: '',
  is_active: true,
};

export default function Companies() {
  const { t, language, isRTL } = useLanguage();
  const { refreshCompanies } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Company.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      refreshCompanies();
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Company.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      refreshCompanies();
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Company.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      refreshCompanies();
      setDeleteOpen(false);
      toast.success(t('deletedSuccessfully'));
    },
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData(initialFormData);
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
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const exportColumns = [
    { accessorKey: 'company_code', header: language === 'ar' ? 'الكود' : 'Code', headerAr: 'الكود', required: true },
    { accessorKey: 'company_name_ar', header: language === 'ar' ? 'الاسم بالعربية' : 'Name (AR)', headerAr: 'الاسم بالعربية', required: true },
    { accessorKey: 'company_name_en', header: language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (EN)', headerAr: 'الاسم بالإنجليزية', required: true },
    { accessorKey: 'tax_id', header: language === 'ar' ? 'الرقم الضريبي' : 'Tax ID', headerAr: 'الرقم الضريبي' },
    { accessorKey: 'commercial_register', header: language === 'ar' ? 'السجل التجاري' : 'Commercial Register', headerAr: 'السجل التجاري' },
    { accessorKey: 'base_currency', header: language === 'ar' ? 'العملة' : 'Currency', headerAr: 'العملة' },
    { accessorKey: 'vat_percentage', header: language === 'ar' ? 'نسبة الضريبة' : 'VAT %', headerAr: 'نسبة الضريبة', type: 'number' },
    { accessorKey: 'default_retention_percentage', header: language === 'ar' ? 'نسبة الضمان' : 'Retention %', headerAr: 'نسبة الضمان', type: 'number' },
    { accessorKey: 'phone', header: language === 'ar' ? 'الهاتف' : 'Phone', headerAr: 'الهاتف' },
    { accessorKey: 'email', header: language === 'ar' ? 'البريد' : 'Email', headerAr: 'البريد' },
    { accessorKey: 'website', header: language === 'ar' ? 'الموقع' : 'Website', headerAr: 'الموقع' },
    { accessorKey: 'address_ar', header: language === 'ar' ? 'العنوان بالعربية' : 'Address (AR)', headerAr: 'العنوان بالعربية' },
    { accessorKey: 'address_en', header: language === 'ar' ? 'العنوان بالإنجليزية' : 'Address (EN)', headerAr: 'العنوان بالإنجليزية' },
    { accessorKey: 'is_active', header: language === 'ar' ? 'نشط' : 'Active', headerAr: 'نشط', type: 'boolean' }
  ];

  const columns = [
    {
      header: t('code'),
      accessor: 'company_code',
      sortable: true,
    },
    {
      header: t('name'),
      accessor: 'company_name_ar',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium">
            {language === 'ar' ? row.company_name_ar : row.company_name_en}
          </p>
          <p className="text-sm text-slate-500">
            {language === 'ar' ? row.company_name_en : row.company_name_ar}
          </p>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'الرقم الضريبي' : 'Tax ID',
      accessor: 'tax_id',
    },
    {
      header: t('phone'),
      accessor: 'phone',
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
        title={t('companies')}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'شركة' : 'Company'}`}
      >
        <ImportExportActions
          entityName={ENTITY_NAME}
          moduleName={MODULE_NAME}
          data={companies}
          columns={exportColumns}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['companies'] })}
        />
      </PageHeader>

      <DataTable
        columns={columns}
        data={companies}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `${t('edit')} ${t('companies')}` : `${t('add')} ${t('companies')}`}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('code')} *</Label>
            <Input
              value={formData.company_code}
              onChange={(e) => setFormData({ ...formData, company_code: e.target.value })}
              placeholder="COMP-001"
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'العملة' : 'Currency'}</Label>
            <Input
              value={formData.base_currency}
              onChange={(e) => setFormData({ ...formData, base_currency: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('nameAr')} *</Label>
            <Input
              value={formData.company_name_ar}
              onChange={(e) => setFormData({ ...formData, company_name_ar: e.target.value })}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('nameEn')} *</Label>
            <Input
              value={formData.company_name_en}
              onChange={(e) => setFormData({ ...formData, company_name_en: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الرقم الضريبي' : 'Tax ID'}</Label>
            <Input
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'السجل التجاري' : 'Commercial Register'}</Label>
            <Input
              value={formData.commercial_register}
              onChange={(e) => setFormData({ ...formData, commercial_register: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('phone')}</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('email')}</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('address')} (AR)</Label>
            <Textarea
              value={formData.address_ar}
              onChange={(e) => setFormData({ ...formData, address_ar: e.target.value })}
              dir="rtl"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('address')} (EN)</Label>
            <Textarea
              value={formData.address_en}
              onChange={(e) => setFormData({ ...formData, address_en: e.target.value })}
              rows={2}
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