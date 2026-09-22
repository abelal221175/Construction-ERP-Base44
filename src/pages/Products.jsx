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
import { formatCurrency, getLocalizedName } from '@/components/shared/formatters';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const MODULE_NAME = 'MODULE 06';
const ENTITY_NAME = 'Product';

const initialFormData = {
  product_code: '',
  product_name_ar: '',
  product_name_en: '',
  category_id: '',
  uom_ar: '',
  uom_en: '',
  standard_cost: '',
  last_purchase_price: '',
  selling_price: '',
  min_stock_level: '',
  reorder_quantity: '',
};

export default function Products() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Product.filter({ company_id: currentCompany.id })
      : base44.entities.Product.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['productCategories', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.ProductCategory.filter({ company_id: currentCompany.id })
      : base44.entities.ProductCategory.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
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

  const exportColumns = [
    { accessorKey: 'product_code', header: language === 'ar' ? 'الكود' : 'Code', headerAr: 'الكود', required: true },
    { accessorKey: 'product_name_ar', header: language === 'ar' ? 'الاسم بالعربية' : 'Name (AR)', headerAr: 'الاسم بالعربية', required: true },
    { accessorKey: 'product_name_en', header: language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (EN)', headerAr: 'الاسم بالإنجليزية', required: true },
    { accessorKey: 'brand', header: language === 'ar' ? 'العلامة التجارية' : 'Brand', headerAr: 'العلامة التجارية' },
    { accessorKey: 'model', header: language === 'ar' ? 'الموديل' : 'Model', headerAr: 'الموديل' },
    { accessorKey: 'uom_ar', header: language === 'ar' ? 'الوحدة بالعربية' : 'UOM (AR)', headerAr: 'الوحدة بالعربية' },
    { accessorKey: 'uom_en', header: language === 'ar' ? 'الوحدة بالإنجليزية' : 'UOM (EN)', headerAr: 'الوحدة بالإنجليزية' },
    { accessorKey: 'standard_cost', header: language === 'ar' ? 'التكلفة المعيارية' : 'Standard Cost', headerAr: 'التكلفة المعيارية', type: 'number' },
    { accessorKey: 'standard_price', header: language === 'ar' ? 'سعر البيع' : 'Selling Price', headerAr: 'سعر البيع', type: 'number' },
    { accessorKey: 'last_purchase_price', header: language === 'ar' ? 'آخر سعر شراء' : 'Last Purchase Price', headerAr: 'آخر سعر شراء', type: 'number' },
    { accessorKey: 'min_stock_level', header: language === 'ar' ? 'الحد الأدنى' : 'Min Stock', headerAr: 'الحد الأدنى', type: 'number' },
    { accessorKey: 'max_stock_level', header: language === 'ar' ? 'الحد الأقصى' : 'Max Stock', headerAr: 'الحد الأقصى', type: 'number' },
    { accessorKey: 'reorder_point', header: language === 'ar' ? 'نقطة إعادة الطلب' : 'Reorder Point', headerAr: 'نقطة إعادة الطلب', type: 'number' },
    { accessorKey: 'barcode', header: language === 'ar' ? 'الباركود' : 'Barcode', headerAr: 'الباركود' },
    { accessorKey: 'is_active', header: language === 'ar' ? 'نشط' : 'Active', headerAr: 'نشط', type: 'boolean' }
  ];

  const columns = [
    {
      header: t('code'),
      accessor: 'product_code',
      sortable: true,
    },
    {
      header: t('name'),
      accessor: 'product_name_ar',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium">
            {language === 'ar' ? row.product_name_ar : row.product_name_en}
          </p>
          <p className="text-sm text-slate-500">
            {language === 'ar' ? row.product_name_en : row.product_name_ar}
          </p>
        </div>
      ),
    },
    {
      header: t('uom'),
      accessor: 'uom_ar',
      render: (_, row) => language === 'ar' ? row.uom_ar : row.uom_en,
    },
    {
      header: language === 'ar' ? 'التكلفة المعيارية' : 'Standard Cost',
      accessor: 'standard_cost',
      render: (value) => formatCurrency(value, 'EGP'),
    },
    {
      header: language === 'ar' ? 'آخر سعر شراء' : 'Last Purchase Price',
      accessor: 'last_purchase_price',
      render: (value) => formatCurrency(value, 'EGP'),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('products')}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'منتج' : 'Product'}`}
      >
        <ImportExportActions
          entityName={ENTITY_NAME}
          moduleName={MODULE_NAME}
          data={products}
          columns={exportColumns}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
        />
      </PageHeader>

      <DataTable
        columns={columns}
        data={products}
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
              value={formData.product_code}
              onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
              placeholder="PRD-001"
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'التصنيف' : 'Category'}</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {getLocalizedName(cat, language, 'category_name_ar', 'category_name_en')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('nameAr')} *</Label>
            <Input
              value={formData.product_name_ar}
              onChange={(e) => setFormData({ ...formData, product_name_ar: e.target.value })}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('nameEn')} *</Label>
            <Input
              value={formData.product_name_en}
              onChange={(e) => setFormData({ ...formData, product_name_en: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('uom')} (AR)</Label>
            <Input
              value={formData.uom_ar}
              onChange={(e) => setFormData({ ...formData, uom_ar: e.target.value })}
              placeholder="كجم"
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('uom')} (EN)</Label>
            <Input
              value={formData.uom_en}
              onChange={(e) => setFormData({ ...formData, uom_en: e.target.value })}
              placeholder="kg"
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'التكلفة المعيارية' : 'Standard Cost'}</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.standard_cost}
              onChange={(e) => setFormData({ ...formData, standard_cost: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'سعر البيع' : 'Selling Price'}</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.selling_price}
              onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الحد الأدنى للمخزون' : 'Min Stock Level'}</Label>
            <Input
              type="number"
              value={formData.min_stock_level}
              onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'كمية إعادة الطلب' : 'Reorder Qty'}</Label>
            <Input
              type="number"
              value={formData.reorder_quantity}
              onChange={(e) => setFormData({ ...formData, reorder_quantity: e.target.value })}
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