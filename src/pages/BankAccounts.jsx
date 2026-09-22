import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from '@/components/shared/formatters';

const initialFormData = {
  account_name: '',
  bank_id: '',
  account_number: '',
  iban: '',
  swift_code: '',
  currency: 'EGP',
  gl_account_id: '',
  current_balance: 0,
  is_active: true
};

export default function BankAccounts() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['bankAccounts', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.BankAccount.filter({ company_id: currentCompany.id }) : [],
  });

  const { data: businessPartners = [] } = useQuery({
    queryKey: ['businessPartners'],
    queryFn: () => base44.entities.BusinessPartner.list(),
  });

  const { data: glAccounts = [] } = useQuery({
    queryKey: ['glAccounts'],
    queryFn: () => base44.entities.GLAccount.list(),
  });

  const banks = businessPartners.filter(bp => bp.is_bank);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BankAccount.create({ ...data, company_id: currentCompany?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      setModalOpen(false);
      toast.success(language === 'ar' ? 'تم الإنشاء بنجاح' : 'Created successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankAccount.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      setModalOpen(false);
      toast.success(language === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BankAccount.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      setDeleteOpen(false);
      toast.success(language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
    }
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData(initialFormData);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
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
    { header: language === 'ar' ? 'اسم الحساب' : 'Account Name', accessorKey: 'account_name' },
    { 
      header: language === 'ar' ? 'البنك' : 'Bank', 
      accessorKey: 'bank_id',
      cell: (row) => {
        const bank = banks.find(b => b.id === row.bank_id);
        return bank ? (language === 'ar' ? bank.bp_name_ar : bank.bp_name_en) : '-';
      }
    },
    { header: language === 'ar' ? 'رقم الحساب' : 'Account Number', accessorKey: 'account_number' },
    { header: 'IBAN', accessorKey: 'iban' },
    { header: language === 'ar' ? 'العملة' : 'Currency', accessorKey: 'currency' },
    { 
      header: language === 'ar' ? 'الرصيد' : 'Balance', 
      accessorKey: 'current_balance',
      cell: (row) => formatCurrency(row.current_balance, row.currency)
    },
    { 
      header: language === 'ar' ? 'الحالة' : 'Status', 
      accessorKey: 'is_active',
      cell: (row) => (
        <Badge className={row.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
          {row.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
        </Badge>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader
        title={language === 'ar' ? 'الحسابات البنكية' : 'Bank Accounts'}
        onAdd={handleAdd}
        addLabel={language === 'ar' ? 'إضافة حساب' : 'Add Account'}
      />

      <DataTable
        data={accounts}
        columns={columns}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={(item) => { setEditingItem(item); setDeleteOpen(true); }}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? (language === 'ar' ? 'تعديل الحساب' : 'Edit Account') : (language === 'ar' ? 'إضافة حساب' : 'Add Account')}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="lg"
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اسم الحساب' : 'Account Name'} *</Label>
              <Input value={formData.account_name} onChange={(e) => setFormData({ ...formData, account_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'البنك' : 'Bank'}</Label>
              <Select value={formData.bank_id} onValueChange={(v) => setFormData({ ...formData, bank_id: v })}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر البنك' : 'Select Bank'} /></SelectTrigger>
                <SelectContent>
                  {banks.map(bank => (
                    <SelectItem key={bank.id} value={bank.id}>{language === 'ar' ? bank.bp_name_ar : bank.bp_name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'رقم الحساب' : 'Account Number'} *</Label>
              <Input value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input value={formData.iban} onChange={(e) => setFormData({ ...formData, iban: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SWIFT Code</Label>
              <Input value={formData.swift_code} onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'العملة' : 'Currency'}</Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">EGP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="SAR">SAR</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'حساب الأستاذ' : 'GL Account'}</Label>
              <Select value={formData.gl_account_id} onValueChange={(v) => setFormData({ ...formData, gl_account_id: v })}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر الحساب' : 'Select Account'} /></SelectTrigger>
                <SelectContent>
                  {glAccounts.filter(a => a.is_cash_bank).map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.account_code} - {language === 'ar' ? acc.account_name_ar : acc.account_name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}</Label>
              <Input type="number" value={formData.current_balance} onChange={(e) => setFormData({ ...formData, current_balance: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="is_active" checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} />
            <Label htmlFor="is_active">{language === 'ar' ? 'نشط' : 'Active'}</Label>
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