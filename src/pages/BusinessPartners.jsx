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
import { formatDate, getLocalizedName } from '@/components/shared/formatters';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MODULE_NAME = 'MODULE 05';
const ENTITY_NAME = 'BusinessPartner';

const initialFormData = {
  bp_code: '',
  bp_name_ar: '',
  bp_name_en: '',
  is_client: false,
  is_supplier: false,
  is_subcontractor: false,
  is_consultant: false,
  is_bank: false,
  tax_id: '',
  commercial_register: '',
  payment_terms_days: 30,
  credit_limit: '',
  phone: '',
  email: '',
  address_ar: '',
  address_en: '',
  search_keywords_ar: '',
  search_keywords_en: '',
};

export default function BusinessPartners() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: businessPartners = [], isLoading } = useQuery({
    queryKey: ['businessPartners', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.BusinessPartner.filter({ company_id: currentCompany.id })
      : base44.entities.BusinessPartner.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BusinessPartner.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessPartners'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BusinessPartner.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessPartners'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BusinessPartner.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessPartners'] });
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

  const getTypesBadges = (bp) => {
    const types = [];
    if (bp.is_client) types.push({ label: language === 'ar' ? 'عميل' : 'Client', color: 'bg-blue-100 text-blue-700' });
    if (bp.is_supplier) types.push({ label: language === 'ar' ? 'مورد' : 'Supplier', color: 'bg-emerald-100 text-emerald-700' });
    if (bp.is_subcontractor) types.push({ label: language === 'ar' ? 'مقاول باطن' : 'Subcontractor', color: 'bg-purple-100 text-purple-700' });
    if (bp.is_consultant) types.push({ label: language === 'ar' ? 'استشاري' : 'Consultant', color: 'bg-amber-100 text-amber-700' });
    if (bp.is_bank) types.push({ label: language === 'ar' ? 'بنك' : 'Bank', color: 'bg-slate-100 text-slate-700' });
    return types;
  };

  const exportColumns = [
    { accessorKey: 'bp_code', header: language === 'ar' ? 'الكود' : 'Code', headerAr: 'الكود', required: true },
    { accessorKey: 'bp_name_ar', header: language === 'ar' ? 'الاسم بالعربية' : 'Name (AR)', headerAr: 'الاسم بالعربية', required: true },
    { accessorKey: 'bp_name_en', header: language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (EN)', headerAr: 'الاسم بالإنجليزية', required: true },
    { accessorKey: 'is_client', header: language === 'ar' ? 'عميل' : 'Client', headerAr: 'عميل', type: 'boolean' },
    { accessorKey: 'is_supplier', header: language === 'ar' ? 'مورد' : 'Supplier', headerAr: 'مورد', type: 'boolean' },
    { accessorKey: 'is_subcontractor', header: language === 'ar' ? 'مقاول باطن' : 'Subcontractor', headerAr: 'مقاول باطن', type: 'boolean' },
    { accessorKey: 'is_consultant', header: language === 'ar' ? 'استشاري' : 'Consultant', headerAr: 'استشاري', type: 'boolean' },
    { accessorKey: 'tax_id', header: language === 'ar' ? 'الرقم الضريبي' : 'Tax ID', headerAr: 'الرقم الضريبي' },
    { accessorKey: 'commercial_register', header: language === 'ar' ? 'السجل التجاري' : 'Commercial Register', headerAr: 'السجل التجاري' },
    { accessorKey: 'phone', header: language === 'ar' ? 'الهاتف' : 'Phone', headerAr: 'الهاتف' },
    { accessorKey: 'mobile', header: language === 'ar' ? 'الجوال' : 'Mobile', headerAr: 'الجوال' },
    { accessorKey: 'email', header: language === 'ar' ? 'البريد' : 'Email', headerAr: 'البريد' },
    { accessorKey: 'website', header: language === 'ar' ? 'الموقع' : 'Website', headerAr: 'الموقع' },
    { accessorKey: 'payment_terms_days', header: language === 'ar' ? 'شروط الدفع' : 'Payment Terms', headerAr: 'شروط الدفع', type: 'number' },
    { accessorKey: 'credit_limit', header: language === 'ar' ? 'الحد الائتماني' : 'Credit Limit', headerAr: 'الحد الائتماني', type: 'number' },
    { accessorKey: 'currency', header: language === 'ar' ? 'العملة' : 'Currency', headerAr: 'العملة' },
    { accessorKey: 'address_ar', header: language === 'ar' ? 'العنوان بالعربية' : 'Address (AR)', headerAr: 'العنوان بالعربية' },
    { accessorKey: 'address_en', header: language === 'ar' ? 'العنوان بالإنجليزية' : 'Address (EN)', headerAr: 'العنوان بالإنجليزية' },
    { accessorKey: 'city_ar', header: language === 'ar' ? 'المدينة بالعربية' : 'City (AR)', headerAr: 'المدينة بالعربية' },
    { accessorKey: 'city_en', header: language === 'ar' ? 'المدينة بالإنجليزية' : 'City (EN)', headerAr: 'المدينة بالإنجليزية' },
    { accessorKey: 'country', header: language === 'ar' ? 'الدولة' : 'Country', headerAr: 'الدولة' },
    { accessorKey: 'is_active', header: language === 'ar' ? 'نشط' : 'Active', headerAr: 'نشط', type: 'boolean' }
  ];

  const columns = [
    {
      header: t('code'),
      accessor: 'bp_code',
      sortable: true,
    },
    {
      header: t('name'),
      accessor: 'bp_name_ar',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium">
            {language === 'ar' ? row.bp_name_ar : row.bp_name_en}
          </p>
          <p className="text-sm text-slate-500">
            {language === 'ar' ? row.bp_name_en : row.bp_name_ar}
          </p>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'النوع' : 'Type',
      accessor: 'is_client',
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {getTypesBadges(row).map((type, index) => (
            <Badge key={index} variant="outline" className={cn("text-xs border", type.color)}>
              {type.label}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      header: t('phone'),
      accessor: 'phone',
    },
    {
      header: t('email'),
      accessor: 'email',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('businessPartners')}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'شريك تجاري' : 'Partner'}`}
      >
        <ImportExportActions
          entityName={ENTITY_NAME}
          moduleName={MODULE_NAME}
          data={businessPartners}
          columns={exportColumns}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['businessPartners'] })}
        />
      </PageHeader>

      <DataTable
        columns={columns}
        data={businessPartners}
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
              value={formData.bp_code}
              onChange={(e) => setFormData({ ...formData, bp_code: e.target.value })}
              placeholder="BP-001"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>{language === 'ar' ? 'النوع' : 'Type'} *</Label>
            <div className={cn("flex flex-wrap gap-4", isRTL && "flex-row-reverse")}>
              {[
                { key: 'is_client', label_ar: 'عميل', label_en: 'Client' },
                { key: 'is_supplier', label_ar: 'مورد', label_en: 'Supplier' },
                { key: 'is_subcontractor', label_ar: 'مقاول باطن', label_en: 'Subcontractor' },
                { key: 'is_consultant', label_ar: 'استشاري', label_en: 'Consultant' },
                { key: 'is_bank', label_ar: 'بنك', label_en: 'Bank' },
              ].map(type => (
                <div key={type.key} className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Checkbox
                    id={type.key}
                    checked={formData[type.key]}
                    onCheckedChange={(checked) => setFormData({ ...formData, [type.key]: checked })}
                  />
                  <label htmlFor={type.key} className="text-sm cursor-pointer">
                    {language === 'ar' ? type.label_ar : type.label_en}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('nameAr')} *</Label>
            <Input
              value={formData.bp_name_ar}
              onChange={(e) => setFormData({ ...formData, bp_name_ar: e.target.value })}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('nameEn')} *</Label>
            <Input
              value={formData.bp_name_en}
              onChange={(e) => setFormData({ ...formData, bp_name_en: e.target.value })}
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
            <Label>{language === 'ar' ? 'شروط الدفع (أيام)' : 'Payment Terms (days)'}</Label>
            <Input
              type="number"
              value={formData.payment_terms_days}
              onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 30 })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الحد الائتماني' : 'Credit Limit'}</Label>
            <Input
              type="number"
              value={formData.credit_limit}
              onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
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