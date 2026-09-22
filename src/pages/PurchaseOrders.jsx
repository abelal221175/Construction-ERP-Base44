import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import BOQItemSelector from '@/components/shared/BOQItemSelector';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate, getLocalizedName, formatNumber } from '@/components/shared/formatters';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const initialFormData = {
  po_number: '',
  po_date: new Date().toISOString().split('T')[0],
  supplier_id: '',
  project_id: '',
  boq_id: '',
  po_type: 'material',
  delivery_date: '',
  payment_terms_days: 30,
  discount_percentage: 0,
  vat_percentage: 14,
  status: 'draft',
  notes_ar: '',
  notes_en: '',
};

export default function PurchaseOrders() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [lineItems, setLineItems] = useState([]);

  const { data: pos = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.PurchaseOrder.filter({ company_id: currentCompany.id })
      : base44.entities.PurchaseOrder.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Project.filter({ company_id: currentCompany.id })
      : base44.entities.Project.list(),
  });

  const { data: businessPartners = [] } = useQuery({
    queryKey: ['businessPartners', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.BusinessPartner.filter({ company_id: currentCompany.id })
      : base44.entities.BusinessPartner.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Product.filter({ company_id: currentCompany.id })
      : base44.entities.Product.list(),
  });

  const suppliers = businessPartners.filter(bp => bp.is_supplier);

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const discountAmount = subtotal * (parseFloat(formData.discount_percentage) || 0) / 100;
    const afterDiscount = subtotal - discountAmount;
    const vatAmount = afterDiscount * (parseFloat(formData.vat_percentage) || 0) / 100;
    const total = afterDiscount + vatAmount;
    return { subtotal, discountAmount, vatAmount, total };
  };

  const totals = calculateTotals();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const po = await base44.entities.PurchaseOrder.create({
        ...data,
        subtotal_amount: totals.subtotal,
        discount_amount: totals.discountAmount,
        vat_amount: totals.vatAmount,
        total_amount: totals.total,
      });
      
      // Create line items
      for (let i = 0; i < lineItems.length; i++) {
        await base44.entities.POLine.create({
          po_id: po.id,
          line_no: i + 1,
          ...lineItems[i],
        });
      }
      
      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.PurchaseOrder.update(id, {
        ...data,
        subtotal_amount: totals.subtotal,
        discount_amount: totals.discountAmount,
        vat_amount: totals.vatAmount,
        total_amount: totals.total,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PurchaseOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setDeleteOpen(false);
      toast.success(t('deletedSuccessfully'));
    },
  });

  const handleAdd = () => {
    setEditingItem(null);
    const nextNum = pos.length + 1;
    setFormData({ 
      ...initialFormData, 
      company_id: currentCompany?.id,
      po_number: `PO-${String(nextNum).padStart(4, '0')}`,
    });
    setLineItems([{
      product_id: '',
      item_description_ar: '',
      item_description_en: '',
      quantity: 1,
      uom_ar: '',
      uom_en: '',
      unit_price: 0,
      total_price: 0,
    }]);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      ...initialFormData,
      ...item,
      po_date: item.po_date?.split('T')[0] || '',
      delivery_date: item.delivery_date?.split('T')[0] || '',
      boq_id: item.boq_id || '',
    });
    setLineItems([]);
    setModalOpen(true);
  };

  const handleRecommendationSelect = (recommendation) => {
    const newItem = {
      product_id: recommendation.resource_id || '',
      item_description_ar: recommendation.description_ar || '',
      item_description_en: recommendation.description_en || '',
      quantity: recommendation.quantity || 1,
      uom_ar: recommendation.uom_ar || '',
      uom_en: recommendation.uom_en || '',
      unit_price: recommendation.unit_cost || 0,
      total_price: (recommendation.quantity || 1) * (recommendation.unit_cost || 0),
      boq_id: recommendation.boq_id || '',
    };
    setLineItems(prev => [...prev, newItem]);
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

  const addLineItem = () => {
    setLineItems([...lineItems, {
      product_id: '',
      item_description_ar: '',
      item_description_en: '',
      quantity: 1,
      uom_ar: '',
      uom_en: '',
      unit_price: 0,
      total_price: 0,
    }]);
  };

  const updateLineItem = (index, field, value) => {
    setLineItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      
      if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        if (product) {
          newItems[index].item_description_ar = product.product_name_ar;
          newItems[index].item_description_en = product.product_name_en;
          newItems[index].uom_ar = product.uom_ar;
          newItems[index].uom_en = product.uom_en;
          newItems[index].unit_price = product.last_purchase_price || product.standard_cost || 0;
        }
      }
      
      if (field === 'quantity' || field === 'unit_price') {
        const qty = parseFloat(newItems[index].quantity) || 0;
        const price = parseFloat(newItems[index].unit_price) || 0;
        newItems[index].total_price = qty * price;
      }
      
      return newItems;
    });
  };

  const removeLineItem = (index) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const columns = [
    {
      header: t('poNumber'),
      accessor: 'po_number',
      sortable: true,
    },
    {
      header: t('date'),
      accessor: 'po_date',
      render: (value) => formatDate(value),
    },
    {
      header: t('supplier'),
      accessor: 'supplier_id',
      render: (value) => {
        const supplier = businessPartners.find(bp => bp.id === value);
        return supplier ? getLocalizedName(supplier, language, 'bp_name_ar', 'bp_name_en') : '-';
      },
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
      header: t('total'),
      accessor: 'total_amount',
      render: (value) => formatCurrency(value, 'EGP'),
    },
    {
      header: t('status'),
      accessor: 'status',
      render: (value) => <StatusBadge status={value} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('purchaseOrders')}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'أمر شراء' : 'PO'}`}
      />

      <DataTable
        columns={columns}
        data={pos}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `${t('edit')} ${t('purchaseOrders')}` : `${t('add')} ${t('purchaseOrders')}`}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="xl"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t('poNumber')} *</Label>
              <Input
                value={formData.po_number}
                onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('date')} *</Label>
              <Input
                type="date"
                value={formData.po_date}
                onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('supplier')} *</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectAll')} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {getLocalizedName(supplier, language, 'bp_name_ar', 'bp_name_en')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('project')} *</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value, boq_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectAll')} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_code} - {project.project_name_ar || project.project_name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع الأمر' : 'PO Type'}</Label>
              <Select
                value={formData.po_type}
                onValueChange={(value) => setFormData({ ...formData, po_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">{language === 'ar' ? 'مواد' : 'Materials'}</SelectItem>
                  <SelectItem value="equipment">{language === 'ar' ? 'معدات' : 'Equipment'}</SelectItem>
                  <SelectItem value="service">{language === 'ar' ? 'خدمات' : 'Services'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('deliveryDate')}</Label>
              <Input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('paymentTerms')}</Label>
              <Input
                type="number"
                value={formData.payment_terms_days}
                onChange={(e) => setFormData({ ...formData, payment_terms_days: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الخصم %' : 'Discount %'}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.discount_percentage}
                onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
              />
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
                  <SelectItem value="draft">{t('draft')}</SelectItem>
                  <SelectItem value="approved">{t('approved')}</SelectItem>
                  <SelectItem value="sent">{language === 'ar' ? 'مرسل' : 'Sent'}</SelectItem>
                  <SelectItem value="partial">{language === 'ar' ? 'جزئي' : 'Partial'}</SelectItem>
                  <SelectItem value="received">{language === 'ar' ? 'مستلم' : 'Received'}</SelectItem>
                  <SelectItem value="closed">{language === 'ar' ? 'مغلق' : 'Closed'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* BOQ Item Selector */}
          {formData.project_id && (
            <BOQItemSelector
              projectId={formData.project_id}
              selectedBOQId={formData.boq_id}
              onBOQChange={(boqId) => setFormData({ ...formData, boq_id: boqId })}
              onRecommendationSelect={handleRecommendationSelect}
              filterCostTypes={[formData.po_type]}
              showRecommendations={true}
            />
          )}

          {/* Line Items */}
          <div className="space-y-4">
            <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
              <Label className="text-lg font-semibold">{language === 'ar' ? 'البنود' : 'Line Items'}</Label>
              <Button variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                {t('add')}
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                  <TableHead>{t('description')}</TableHead>
                  <TableHead className="text-center">{t('quantity')}</TableHead>
                  <TableHead className="text-center">{t('uom')}</TableHead>
                  <TableHead className="text-right">{t('unitPrice')}</TableHead>
                  <TableHead className="text-right">{t('total')}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={item.product_id}
                        onValueChange={(value) => updateLineItem(index, 'product_id', value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder={t('selectAll')} />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.product_code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={language === 'ar' ? item.item_description_ar : item.item_description_en}
                        onChange={(e) => updateLineItem(index, language === 'ar' ? 'item_description_ar' : 'item_description_en', e.target.value)}
                        className="w-48"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                        className="w-24 text-center"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {language === 'ar' ? item.uom_ar : item.uom_en}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                        className="w-28 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatNumber(item.total_price, 2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeLineItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totals */}
            <div className={cn("flex justify-end", isRTL && "justify-start")}>
              <div className="w-72 space-y-2 p-4 bg-slate-50 rounded-lg">
                <div className={cn("flex justify-between", isRTL && "flex-row-reverse")}>
                  <span>{t('subtotal')}:</span>
                  <span className="font-mono">{formatNumber(totals.subtotal, 2)}</span>
                </div>
                <div className={cn("flex justify-between text-slate-600", isRTL && "flex-row-reverse")}>
                  <span>{language === 'ar' ? 'الخصم' : 'Discount'}:</span>
                  <span className="font-mono">-{formatNumber(totals.discountAmount, 2)}</span>
                </div>
                <div className={cn("flex justify-between text-slate-600", isRTL && "flex-row-reverse")}>
                  <span>{t('vat')} {formData.vat_percentage}%:</span>
                  <span className="font-mono">+{formatNumber(totals.vatAmount, 2)}</span>
                </div>
                <div className={cn("flex justify-between text-lg font-bold border-t pt-2", isRTL && "flex-row-reverse")}>
                  <span>{t('total')}:</span>
                  <span className="font-mono">{formatCurrency(totals.total, 'EGP')}</span>
                </div>
              </div>
            </div>
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