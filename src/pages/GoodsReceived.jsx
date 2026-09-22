import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, getLocalizedName } from '@/components/shared/formatters';
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { postGRNApproval } from '@/lib/glPostingEngine';

const initialFormData = {
  grn_number: '',
  grn_date: new Date().toISOString().split('T')[0],
  po_id: '',
  supplier_id: '',
  warehouse_id: '',
  supplier_invoice_no: '',
  supplier_invoice_date: '',
  notes_ar: '',
  notes_en: '',
  status: 'draft',
};

export default function GoodsReceived() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: grns = [], isLoading } = useQuery({
    queryKey: ['goodsReceived', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.GoodsReceivedNote.filter({ company_id: currentCompany.id })
      : base44.entities.GoodsReceivedNote.list(),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.PurchaseOrder.filter({ company_id: currentCompany.id })
      : base44.entities.PurchaseOrder.list(),
  });

  const { data: businessPartners = [] } = useQuery({
    queryKey: ['businessPartners', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.BusinessPartner.filter({ company_id: currentCompany.id })
      : base44.entities.BusinessPartner.list(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Warehouse.filter({ company_id: currentCompany.id })
      : base44.entities.Warehouse.list(),
  });

  const { data: glAccounts = [] } = useQuery({
    queryKey: ['glAccounts', currentCompany?.id],
    queryFn: () => currentCompany
      ? base44.entities.GLAccount.filter({ company_id: currentCompany.id })
      : base44.entities.GLAccount.list(),
  });

  const { data: grnLines = [] } = useQuery({
    queryKey: ['grnLines', editingItem?.id],
    queryFn: () => editingItem?.id
      ? base44.entities.GRNLine.filter({ grn_id: editingItem.id })
      : [],
    enabled: !!editingItem?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.GoodsReceivedNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goodsReceived'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.GoodsReceivedNote.update(id, data);

      // Post GL entries when GRN is approved/posted
      if (data.status === 'posted' || data.status === 'accepted') {
        try {
          // Fetch GRN lines if not already loaded
          let lines = grnLines;
          if (lines.length === 0) {
            lines = await base44.entities.GRNLine.filter({ grn_id: id });
          }
          await postGRNApproval({
            grn: { id, grn_number: data.grn_number, grn_date: data.grn_date },
            grnLines: lines,
            accounts: glAccounts,
            companyId: currentCompany?.id,
            costCenterId: data.project_id,
          });
        } catch (e) {
          console.error('[GL Posting] GRN posting failed:', e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goodsReceived'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GoodsReceivedNote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goodsReceived'] });
      setDeleteOpen(false);
      toast.success(t('deletedSuccessfully'));
    },
  });

  const handleAdd = () => {
    setEditingItem(null);
    const nextNum = grns.length + 1;
    setFormData({ 
      ...initialFormData, 
      company_id: currentCompany?.id,
      grn_number: `GRN-${String(nextNum).padStart(4, '0')}`,
    });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      ...initialFormData,
      ...item,
      grn_date: item.grn_date?.split('T')[0] || '',
      supplier_invoice_date: item.supplier_invoice_date?.split('T')[0] || '',
    });
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

  // Auto-fill supplier when PO is selected
  const handlePOChange = (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    setFormData({ 
      ...formData, 
      po_id: poId,
      supplier_id: po?.supplier_id || '',
    });
  };

  const columns = [
    {
      header: t('grnNumber'),
      accessor: 'grn_number',
      sortable: true,
    },
    {
      header: t('date'),
      accessor: 'grn_date',
      render: (value) => formatDate(value),
    },
    {
      header: t('poNumber'),
      accessor: 'po_id',
      render: (value) => {
        const po = purchaseOrders.find(p => p.id === value);
        return po ? po.po_number : '-';
      },
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
      header: language === 'ar' ? 'المخزن' : 'Warehouse',
      accessor: 'warehouse_id',
      render: (value) => {
        const wh = warehouses.find(w => w.id === value);
        return wh ? getLocalizedName(wh, language, 'warehouse_name_ar', 'warehouse_name_en') : '-';
      },
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
        title={t('goodsReceived')}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'إذن استلام' : 'GRN'}`}
      />

      <DataTable
        columns={columns}
        data={grns}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `${t('edit')} ${t('goodsReceived')}` : `${t('add')} ${t('goodsReceived')}`}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('grnNumber')} *</Label>
            <Input
              value={formData.grn_number}
              onChange={(e) => setFormData({ ...formData, grn_number: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('date')} *</Label>
            <Input
              type="date"
              value={formData.grn_date}
              onChange={(e) => setFormData({ ...formData, grn_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('poNumber')} *</Label>
            <Select
              value={formData.po_id}
              onValueChange={handlePOChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                {purchaseOrders
                  .filter(po => po.status !== 'closed' && po.status !== 'cancelled')
                  .map(po => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.po_number}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('supplier')}</Label>
            <Select
              value={formData.supplier_id}
              onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                {businessPartners
                  .filter(bp => bp.is_supplier)
                  .map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {getLocalizedName(supplier, language, 'bp_name_ar', 'bp_name_en')}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المخزن' : 'Warehouse'}</Label>
            <Select
              value={formData.warehouse_id}
              onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map(wh => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {getLocalizedName(wh, language, 'warehouse_name_ar', 'warehouse_name_en')}
                  </SelectItem>
                ))}
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
                <SelectItem value="pending_qc">{language === 'ar' ? 'في انتظار الفحص' : 'Pending QC'}</SelectItem>
                <SelectItem value="accepted">{language === 'ar' ? 'مقبول' : 'Accepted'}</SelectItem>
                <SelectItem value="posted">{language === 'ar' ? 'مرحل' : 'Posted'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'رقم فاتورة المورد' : 'Supplier Invoice No.'}</Label>
            <Input
              value={formData.supplier_invoice_no}
              onChange={(e) => setFormData({ ...formData, supplier_invoice_no: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'تاريخ فاتورة المورد' : 'Supplier Invoice Date'}</Label>
            <Input
              type="date"
              value={formData.supplier_invoice_date}
              onChange={(e) => setFormData({ ...formData, supplier_invoice_date: e.target.value })}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>{t('notes')}</Label>
            <Textarea
              value={language === 'ar' ? formData.notes_ar : formData.notes_en}
              onChange={(e) => setFormData({ 
                ...formData, 
                [language === 'ar' ? 'notes_ar' : 'notes_en']: e.target.value 
              })}
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