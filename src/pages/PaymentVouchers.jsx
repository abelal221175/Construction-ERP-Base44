import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext.jsx';
import { useCompany } from '@/components/shared/CompanyContext.jsx';
import { formatNumber, formatCurrency, formatDate, getStatusColor } from '@/components/shared/formatters';
import { cn } from "@/lib/utils";
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const initialFormData = {
  voucher_number: '',
  voucher_date: new Date().toISOString().split('T')[0],
  payment_type: 'transfer',
  bp_id: '',
  amount: '',
  reference: '',
  description: '',
  status: 'draft'
};

export default function PaymentVouchers() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const companyFilter = currentCompany ? { company_id: currentCompany.id } : {};

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ['paymentVouchers', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.PaymentVoucher.filter(companyFilter) : base44.entities.PaymentVoucher.list(),
  });

  const { data: bps = [] } = useQuery({
    queryKey: ['bps', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.BusinessPartner.filter(companyFilter) : base44.entities.BusinessPartner.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PaymentVoucher.create({ ...data, company_id: currentCompany?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentVouchers'] });
      setShowModal(false);
      toast.success(language === 'ar' ? 'تم إنشاء سند الصرف بنجاح' : 'Payment voucher created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PaymentVoucher.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentVouchers'] });
      setShowModal(false);
      toast.success(language === 'ar' ? 'تم تحديث سند الصرف' : 'Payment voucher updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PaymentVoucher.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentVouchers'] });
      setShowDelete(false);
      toast.success(language === 'ar' ? 'تم حذف سند الصرف' : 'Payment voucher deleted');
    },
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ ...initialFormData, voucher_number: `PV-${Date.now().toString().slice(-6)}` });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      voucher_number: item.voucher_number || '',
      voucher_date: item.voucher_date || '',
      payment_type: item.payment_type || 'transfer',
      bp_id: item.bp_id || '',
      amount: item.amount || '',
      reference: item.reference || '',
      description: item.description || '',
      status: item.status || 'draft'
    });
    setShowModal(true);
  };

  const handleSave = () => {
    const data = {
      ...formData,
      amount: parseFloat(formData.amount) || 0
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const typeLabels = {
    cash: { ar: 'نقدي', en: 'Cash' },
    check: { ar: 'شيك', en: 'Check' },
    transfer: { ar: 'تحويل', en: 'Transfer' },
  };

  const statusLabels = {
    draft: { ar: 'مسودة', en: 'Draft' },
    approved: { ar: 'معتمد', en: 'Approved' },
    posted: { ar: 'مرحل', en: 'Posted' },
  };

  const columns = [
    {
      header: language === 'ar' ? 'رقم السند' : 'Voucher No.',
      accessor: 'voucher_number',
      render: (value, row) => (
        <Link to={createPageUrl('PaymentVoucherDetails') + `?id=${row.id}`} className="text-blue-600 hover:underline font-medium">
          {value}
        </Link>
      )
    },
    {
      header: language === 'ar' ? 'التاريخ' : 'Date',
      accessor: 'voucher_date',
      render: (value) => formatDate(value)
    },
    {
      header: language === 'ar' ? 'المستفيد' : 'Beneficiary',
      accessor: 'bp_id',
      render: (value) => {
        const bp = bps.find(b => b.id === value);
        return bp ? (language === 'ar' ? bp.bp_name_ar : bp.bp_name_en) : '-';
      }
    },
    {
      header: language === 'ar' ? 'طريقة الدفع' : 'Payment Type',
      accessor: 'payment_type',
      render: (value) => typeLabels[value]?.[language] || value
    },
    {
      header: language === 'ar' ? 'المبلغ' : 'Amount',
      accessor: 'amount',
      render: (value) => formatCurrency(value)
    },
    {
      header: language === 'ar' ? 'الحالة' : 'Status',
      accessor: 'status',
      render: (value) => (
        <Badge className={getStatusColor(value)}>
          {statusLabels[value]?.[language] || value}
        </Badge>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={language === 'ar' ? 'سندات الصرف' : 'Payment Vouchers'}
        subtitle={language === 'ar' ? 'إدارة سندات الصرف والمدفوعات' : 'Manage payment vouchers'}
        onAdd={handleAdd}
        addLabel={language === 'ar' ? 'سند صرف جديد' : 'New Voucher'}
      />

      <DataTable
        data={vouchers}
        columns={columns}
        isLoading={isLoading}
        searchable
        onEdit={handleEdit}
        onDelete={(item) => { setEditingItem(item); setShowDelete(true); }}
      />

      <FormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? (language === 'ar' ? 'تعديل سند صرف' : 'Edit Voucher') : (language === 'ar' ? 'سند صرف جديد' : 'New Voucher')}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'رقم السند' : 'Voucher Number'}</Label>
              <Input value={formData.voucher_number} onChange={(e) => setFormData({ ...formData, voucher_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
              <Input type="date" value={formData.voucher_date} onChange={(e) => setFormData({ ...formData, voucher_date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المستفيد' : 'Beneficiary'}</Label>
            <Select value={formData.bp_id} onValueChange={(v) => setFormData({ ...formData, bp_id: v })}>
              <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر المستفيد' : 'Select Beneficiary'} /></SelectTrigger>
              <SelectContent>
                {bps.map((bp) => (
                  <SelectItem key={bp.id} value={bp.id}>{language === 'ar' ? bp.bp_name_ar : bp.bp_name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'طريقة الدفع' : 'Payment Type'}</Label>
              <Select value={formData.payment_type} onValueChange={(v) => setFormData({ ...formData, payment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label[language]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المبلغ' : 'Amount'}</Label>
              <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المرجع' : 'Reference'}</Label>
            <Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'البيان' : 'Description'}</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label[language]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormModal>

      <DeleteConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteMutation.mutate(editingItem?.id)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}