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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency, formatDate, getLocalizedName } from '@/components/shared/formatters';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const initialFormData = {
  voucher_number: '',
  voucher_date: new Date().toISOString().split('T')[0],
  receipt_type: 'transfer',
  bp_id: '',
  bank_account_id: '',
  check_number: '',
  check_date: '',
  amount: '',
  project_id: '',
  reference_type: '',
  reference_number: '',
  description: '',
  status: 'draft'
};

export default function ReceiptVouchers() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ['receiptVouchers', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.ReceiptVoucher.filter({ company_id: currentCompany.id }) : [],
  });

  const { data: businessPartners = [] } = useQuery({
    queryKey: ['businessPartners'],
    queryFn: () => base44.entities.BusinessPartner.list(),
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: () => base44.entities.BankAccount.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const clients = businessPartners.filter(bp => bp.is_client);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReceiptVoucher.create({ ...data, company_id: currentCompany?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receiptVouchers'] });
      setModalOpen(false);
      toast.success(language === 'ar' ? 'تم الإنشاء بنجاح' : 'Created successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReceiptVoucher.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receiptVouchers'] });
      setModalOpen(false);
      toast.success(language === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ReceiptVoucher.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receiptVouchers'] });
      setDeleteOpen(false);
      toast.success(language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
    }
  });

  const handleAdd = () => {
    setEditingItem(null);
    const nextNumber = `RV-${String(vouchers.length + 1).padStart(4, '0')}`;
    setFormData({ ...initialFormData, voucher_number: nextNumber });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ 
      ...item,
      voucher_date: item.voucher_date?.split('T')[0] || '',
      check_date: item.check_date?.split('T')[0] || ''
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns = [
    { 
      header: language === 'ar' ? 'رقم السند' : 'Voucher No.', 
      accessorKey: 'voucher_number',
      cell: (row) => (
        <Link to={createPageUrl('ReceiptVouchers') + `?id=${row.id}`} className="text-blue-600 hover:underline font-medium">
          {row.voucher_number}
        </Link>
      )
    },
    { header: language === 'ar' ? 'التاريخ' : 'Date', accessorKey: 'voucher_date', cell: (row) => formatDate(row.voucher_date) },
    { 
      header: language === 'ar' ? 'المستلم من' : 'Received From', 
      accessorKey: 'bp_id',
      cell: (row) => {
        const bp = businessPartners.find(b => b.id === row.bp_id);
        return bp ? getLocalizedName(bp, language, 'bp_name_ar', 'bp_name_en') : '-';
      }
    },
    { 
      header: language === 'ar' ? 'طريقة الاستلام' : 'Receipt Method', 
      accessorKey: 'receipt_type',
      cell: (row) => {
        const types = { cash: 'نقدي', check: 'شيك', transfer: 'تحويل' };
        const typesEn = { cash: 'Cash', check: 'Check', transfer: 'Transfer' };
        return language === 'ar' ? types[row.receipt_type] : typesEn[row.receipt_type];
      }
    },
    { header: language === 'ar' ? 'المبلغ' : 'Amount', accessorKey: 'amount', cell: (row) => formatCurrency(row.amount) },
    { header: language === 'ar' ? 'الحالة' : 'Status', accessorKey: 'status', cell: (row) => <StatusBadge status={row.status} /> }
  ];

  return (
    <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader
        title={language === 'ar' ? 'سندات القبض' : 'Receipt Vouchers'}
        onAdd={handleAdd}
        addLabel={language === 'ar' ? 'إضافة سند' : 'Add Voucher'}
      />

      <DataTable
        data={vouchers}
        columns={columns}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={(item) => { setEditingItem(item); setDeleteOpen(true); }}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? (language === 'ar' ? 'تعديل سند القبض' : 'Edit Receipt') : (language === 'ar' ? 'إضافة سند قبض' : 'Add Receipt')}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="lg"
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'رقم السند' : 'Voucher No.'} *</Label>
              <Input value={formData.voucher_number} onChange={(e) => setFormData({ ...formData, voucher_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'التاريخ' : 'Date'} *</Label>
              <Input type="date" value={formData.voucher_date} onChange={(e) => setFormData({ ...formData, voucher_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'طريقة الاستلام' : 'Receipt Method'}</Label>
              <Select value={formData.receipt_type} onValueChange={(v) => setFormData({ ...formData, receipt_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{language === 'ar' ? 'نقدي' : 'Cash'}</SelectItem>
                  <SelectItem value="check">{language === 'ar' ? 'شيك' : 'Check'}</SelectItem>
                  <SelectItem value="transfer">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المستلم من (العميل)' : 'Received From (Client)'}</Label>
              <Select value={formData.bp_id} onValueChange={(v) => setFormData({ ...formData, bp_id: v })}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر العميل' : 'Select Client'} /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{getLocalizedName(c, language, 'bp_name_ar', 'bp_name_en')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الحساب البنكي' : 'Bank Account'}</Label>
              <Select value={formData.bank_account_id} onValueChange={(v) => setFormData({ ...formData, bank_account_id: v })}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر الحساب' : 'Select Account'} /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.account_name} - {acc.account_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.receipt_type === 'check' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'رقم الشيك' : 'Check Number'}</Label>
                <Input value={formData.check_number} onChange={(e) => setFormData({ ...formData, check_number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'تاريخ الشيك' : 'Check Date'}</Label>
                <Input type="date" value={formData.check_date} onChange={(e) => setFormData({ ...formData, check_date: e.target.value })} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المبلغ' : 'Amount'} *</Label>
              <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || '' })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المشروع' : 'Project'}</Label>
              <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select Project'} /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_code} - {getLocalizedName(p, language, 'project_name_ar', 'project_name_en')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع المرجع' : 'Reference Type'}</Label>
              <Select value={formData.reference_type} onValueChange={(v) => setFormData({ ...formData, reference_type: v })}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر النوع' : 'Select Type'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ipc">{language === 'ar' ? 'مستخلص' : 'IPC'}</SelectItem>
                  <SelectItem value="advance">{language === 'ar' ? 'دفعة مقدمة' : 'Advance'}</SelectItem>
                  <SelectItem value="retention_release">{language === 'ar' ? 'تحرير ضمان' : 'Retention Release'}</SelectItem>
                  <SelectItem value="other">{language === 'ar' ? 'أخرى' : 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'رقم المرجع' : 'Reference Number'}</Label>
              <Input value={formData.reference_number} onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</SelectItem>
                <SelectItem value="submitted">{language === 'ar' ? 'مقدم' : 'Submitted'}</SelectItem>
                <SelectItem value="approved">{language === 'ar' ? 'معتمد' : 'Approved'}</SelectItem>
                <SelectItem value="received">{language === 'ar' ? 'مستلم' : 'Received'}</SelectItem>
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