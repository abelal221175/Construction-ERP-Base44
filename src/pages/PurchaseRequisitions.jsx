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
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate, getLocalizedName } from '@/components/shared/formatters';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  pr_number: '',
  pr_date: new Date().toISOString().split('T')[0],
  pr_type: 'material',
  project_id: '',
  boq_id: '',
  required_date: '',
  priority: 'normal',
  purpose_ar: '',
  purpose_en: '',
  status: 'draft',
};

export default function PurchaseRequisitions() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [lineItems, setLineItems] = useState([]);

  const { data: prs = [], isLoading } = useQuery({
    queryKey: ['purchaseRequisitions', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.PurchaseRequisition.filter({ company_id: currentCompany.id })
      : base44.entities.PurchaseRequisition.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Project.filter({ company_id: currentCompany.id })
      : base44.entities.Project.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Product.filter({ company_id: currentCompany.id })
      : base44.entities.Product.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const totalCost = lineItems.reduce((sum, item) => sum + (item.estimated_total_price || 0), 0);
      const pr = await base44.entities.PurchaseRequisition.create({
        ...data,
        estimated_total_cost: totalCost,
      });
      
      // Create line items
      for (let i = 0; i < lineItems.length; i++) {
        await base44.entities.PRLine.create({
          pr_id: pr.id,
          line_no: i + 1,
          ...lineItems[i],
        });
      }
      
      return pr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseRequisitions'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const totalCost = lineItems.reduce((sum, item) => sum + (item.estimated_total_price || 0), 0);
      await base44.entities.PurchaseRequisition.update(id, {
        ...data,
        estimated_total_cost: totalCost,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseRequisitions'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PurchaseRequisition.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseRequisitions'] });
      setDeleteOpen(false);
      toast.success(t('deletedSuccessfully'));
    },
  });

  const handleAdd = () => {
    setEditingItem(null);
    const nextNum = prs.length + 1;
    setFormData({ 
      ...initialFormData, 
      company_id: currentCompany?.id,
      pr_number: `PR-${String(nextNum).padStart(4, '0')}`,
    });
    setLineItems([{
      product_id: '',
      item_description_ar: '',
      item_description_en: '',
      requested_quantity: 1,
      uom_ar: '',
      uom_en: '',
      estimated_unit_price: 0,
      estimated_total_price: 0,
    }]);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      ...initialFormData,
      ...item,
      pr_date: item.pr_date?.split('T')[0] || '',
      required_date: item.required_date?.split('T')[0] || '',
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
      requested_quantity: recommendation.quantity || 1,
      uom_ar: recommendation.uom_ar || '',
      uom_en: recommendation.uom_en || '',
      estimated_unit_price: recommendation.unit_cost || 0,
      estimated_total_price: (recommendation.quantity || 1) * (recommendation.unit_cost || 0),
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
      requested_quantity: 1,
      uom_ar: '',
      uom_en: '',
      estimated_unit_price: 0,
      estimated_total_price: 0,
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
          newItems[index].estimated_unit_price = product.last_purchase_price || product.standard_cost || 0;
        }
      }
      
      if (field === 'requested_quantity' || field === 'estimated_unit_price') {
        const qty = parseFloat(newItems[index].requested_quantity) || 0;
        const price = parseFloat(newItems[index].estimated_unit_price) || 0;
        newItems[index].estimated_total_price = qty * price;
      }
      
      return newItems;
    });
  };

  const removeLineItem = (index) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const columns = [
    {
      header: t('prNumber'),
      accessor: 'pr_number',
      sortable: true,
    },
    {
      header: t('date'),
      accessor: 'pr_date',
      render: (value) => formatDate(value),
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
      header: language === 'ar' ? 'الأولوية' : 'Priority',
      accessor: 'priority',
      render: (value) => <PriorityBadge priority={value} />,
    },
    {
      header: language === 'ar' ? 'التكلفة المقدرة' : 'Est. Cost',
      accessor: 'estimated_total_cost',
      render: (value) => formatCurrency(value, 'EGP'),
    },
    {
      header: t('status'),
      accessor: 'status',
      render: (value) => <StatusBadge status={value} />,
    },
  ];

  const totalEstimatedCost = lineItems.reduce((sum, item) => sum + (item.estimated_total_price || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('purchaseRequisitions')}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'طلب شراء' : 'PR'}`}
      />

      <DataTable
        columns={columns}
        data={prs}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `${t('edit')} ${t('purchaseRequisitions')}` : `${t('add')} ${t('purchaseRequisitions')}`}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="xl"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t('prNumber')} *</Label>
              <Input
                value={formData.pr_number}
                onChange={(e) => setFormData({ ...formData, pr_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('date')} *</Label>
              <Input
                type="date"
                value={formData.pr_date}
                onChange={(e) => setFormData({ ...formData, pr_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'تاريخ التسليم المطلوب' : 'Required Date'} *</Label>
              <Input
                type="date"
                value={formData.required_date}
                onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الأولوية' : 'Priority'}</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">{language === 'ar' ? 'عاجل' : 'Urgent'}</SelectItem>
                  <SelectItem value="high">{language === 'ar' ? 'عالي' : 'High'}</SelectItem>
                  <SelectItem value="normal">{language === 'ar' ? 'عادي' : 'Normal'}</SelectItem>
                  <SelectItem value="low">{language === 'ar' ? 'منخفض' : 'Low'}</SelectItem>
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
              <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
              <Select
                value={formData.pr_type}
                onValueChange={(value) => setFormData({ ...formData, pr_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">{language === 'ar' ? 'مواد' : 'Material'}</SelectItem>
                  <SelectItem value="equipment">{language === 'ar' ? 'معدات' : 'Equipment'}</SelectItem>
                  <SelectItem value="service">{language === 'ar' ? 'خدمات' : 'Service'}</SelectItem>
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
                  <SelectItem value="draft">{t('draft')}</SelectItem>
                  <SelectItem value="submitted">{t('submitted')}</SelectItem>
                  <SelectItem value="approved">{t('approved')}</SelectItem>
                  <SelectItem value="rejected">{t('rejected')}</SelectItem>
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
              filterCostTypes={formData.pr_type === 'material' ? ['material'] : formData.pr_type === 'equipment' ? ['equipment'] : ['service', 'labor']}
              showRecommendations={true}
            />
          )}

          {/* Purpose */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الغرض (عربي)' : 'Purpose (AR)'}</Label>
              <Textarea
                value={formData.purpose_ar}
                onChange={(e) => setFormData({ ...formData, purpose_ar: e.target.value })}
                dir="rtl"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الغرض (إنجليزي)' : 'Purpose (EN)'}</Label>
              <Textarea
                value={formData.purpose_en}
                onChange={(e) => setFormData({ ...formData, purpose_en: e.target.value })}
                rows={2}
              />
            </div>
          </div>

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
                        value={item.requested_quantity}
                        onChange={(e) => updateLineItem(index, 'requested_quantity', e.target.value)}
                        className="w-24 text-center"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {language === 'ar' ? item.uom_ar : item.uom_en}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.estimated_unit_price}
                        onChange={(e) => updateLineItem(index, 'estimated_unit_price', e.target.value)}
                        className="w-28 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(item.estimated_total_price, 'EGP')}
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

            <div className={cn("flex justify-end p-4 bg-slate-50 rounded-lg", isRTL && "flex-row-reverse")}>
              <div className="text-lg font-bold">
                {language === 'ar' ? 'الإجمالي:' : 'Total:'} {formatCurrency(totalEstimatedCost, 'EGP')}
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