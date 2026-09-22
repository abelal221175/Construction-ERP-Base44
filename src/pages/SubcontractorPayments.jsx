import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate, formatNumber, getLocalizedName } from '@/components/shared/formatters';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Wallet, CreditCard, Building2, FileText } from 'lucide-react';

const initialFormData = {
  subcontract_id: '',
  ipc_id: '',
  payment_number: '',
  payment_date: '',
  payment_type: 'progress',
  payment_method: 'transfer',
  bank_account_id: '',
  check_number: '',
  check_date: '',
  gross_amount: 0,
  tax_deduction: 0,
  other_deductions: 0,
  net_amount: 0,
  reference: '',
  notes: '',
  status: 'draft',
};

const paymentTypeLabels = {
  ar: {
    advance: 'دفعة مقدمة',
    progress: 'دفعة تشغيلية',
    retention_release: 'تحرير ضمان',
    final: 'دفعة ختامية',
  },
  en: {
    advance: 'Advance Payment',
    progress: 'Progress Payment',
    retention_release: 'Retention Release',
    final: 'Final Payment',
  },
};

const paymentMethodLabels = {
  ar: {
    cash: 'نقدي',
    check: 'شيك',
    transfer: 'تحويل بنكي',
  },
  en: {
    cash: 'Cash',
    check: 'Check',
    transfer: 'Bank Transfer',
  },
};

export default function SubcontractorPayments() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['subcontractorPayments', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.SubcontractorPayment.filter({ company_id: currentCompany.id })
      : base44.entities.SubcontractorPayment.list(),
  });

  const { data: subcontracts = [] } = useQuery({
    queryKey: ['subcontracts', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Subcontract.filter({ company_id: currentCompany.id })
      : base44.entities.Subcontract.list(),
  });

  const { data: ipcs = [] } = useQuery({
    queryKey: ['subcontractorIPCs', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.SubcontractorIPC.filter({ company_id: currentCompany.id })
      : base44.entities.SubcontractorIPC.list(),
  });

  const { data: businessPartners = [] } = useQuery({
    queryKey: ['businessPartners', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.BusinessPartner.filter({ company_id: currentCompany.id })
      : base44.entities.BusinessPartner.list(),
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bankAccounts', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.BankAccount.filter({ company_id: currentCompany.id })
      : base44.entities.BankAccount.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SubcontractorPayment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractorPayments'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SubcontractorPayment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractorPayments'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SubcontractorPayment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractorPayments'] });
      setDeleteOpen(false);
      toast.success(t('deletedSuccessfully'));
    },
  });

  // Calculate net amount
  useEffect(() => {
    const gross = parseFloat(formData.gross_amount) || 0;
    const tax = parseFloat(formData.tax_deduction) || 0;
    const other = parseFloat(formData.other_deductions) || 0;
    const net = gross - tax - other;
    setFormData(prev => ({ ...prev, net_amount: net }));
  }, [formData.gross_amount, formData.tax_deduction, formData.other_deductions]);

  const handleAdd = () => {
    setEditingItem(null);
    const nextNum = payments.length + 1;
    setFormData({ 
      ...initialFormData, 
      company_id: currentCompany?.id,
      payment_number: `SCPAY-${String(nextNum).padStart(4, '0')}`,
      payment_date: new Date().toISOString().split('T')[0],
    });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      ...initialFormData,
      ...item,
      payment_date: item.payment_date?.split('T')[0] || '',
      check_date: item.check_date?.split('T')[0] || '',
    });
    setModalOpen(true);
  };

  const handleDelete = (item) => {
    setEditingItem(item);
    setDeleteOpen(true);
  };

  const handleSubcontractChange = (subcontractId) => {
    setFormData(prev => ({
      ...prev,
      subcontract_id: subcontractId,
      ipc_id: '',
    }));
  };

  const handleIPCSelect = (ipcId) => {
    const ipc = ipcs.find(i => i.id === ipcId);
    if (ipc) {
      const paidOnIPC = payments
        .filter(p => p.ipc_id === ipcId && p.status === 'paid')
        .reduce((sum, p) => sum + (p.net_amount || 0), 0);
      const remaining = (ipc.net_payable_amount || 0) - paidOnIPC;
      
      setFormData(prev => ({
        ...prev,
        ipc_id: ipcId,
        gross_amount: Math.max(0, remaining),
      }));
    }
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

  // Get filtered IPCs for selected subcontract
  const filteredIPCs = ipcs.filter(ipc => 
    ipc.subcontract_id === formData.subcontract_id && 
    ['approved', 'certified', 'partially_paid'].includes(ipc.status)
  );

  // Calculate totals
  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.net_amount || 0), 0);
  const totalPending = payments
    .filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + (p.net_amount || 0), 0);

  const columns = [
    {
      header: language === 'ar' ? 'رقم الدفعة' : 'Payment No.',
      accessor: 'payment_number',
      sortable: true,
    },
    {
      header: language === 'ar' ? 'المقاول' : 'Subcontractor',
      accessor: 'subcontract_id',
      render: (value) => {
        const sc = subcontracts.find(s => s.id === value);
        if (!sc) return '-';
        const sub = businessPartners.find(bp => bp.id === sc.subcontractor_id);
        return (
          <div>
            <div className="font-medium">{sc.subcontract_number}</div>
            <div className="text-xs text-slate-500">
              {sub ? getLocalizedName(sub, language, 'bp_name_ar', 'bp_name_en') : ''}
            </div>
          </div>
        );
      },
    },
    {
      header: t('date'),
      accessor: 'payment_date',
      render: (value) => formatDate(value),
    },
    {
      header: language === 'ar' ? 'النوع' : 'Type',
      accessor: 'payment_type',
      render: (value) => (
        <Badge variant="outline">
          {paymentTypeLabels[language][value] || value}
        </Badge>
      ),
    },
    {
      header: language === 'ar' ? 'الطريقة' : 'Method',
      accessor: 'payment_method',
      render: (value) => (
        <Badge variant="secondary">
          {paymentMethodLabels[language][value] || value}
        </Badge>
      ),
    },
    {
      header: language === 'ar' ? 'المبلغ الإجمالي' : 'Gross Amount',
      accessor: 'gross_amount',
      render: (value) => formatCurrency(value, 'EGP'),
    },
    {
      header: language === 'ar' ? 'صافي المبلغ' : 'Net Amount',
      accessor: 'net_amount',
      render: (value) => <span className="font-medium text-green-600">{formatCurrency(value, 'EGP')}</span>,
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
        title={language === 'ar' ? 'مدفوعات المقاولين' : 'Subcontractor Payments'}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'دفعة' : 'Payment'}`}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{language === 'ar' ? 'إجمالي المدفوع' : 'Total Paid'}</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid, 'EGP')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{language === 'ar' ? 'قيد الدفع' : 'Pending Payment'}</p>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(totalPending, 'EGP')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{language === 'ar' ? 'عدد الدفعات' : 'Total Payments'}</p>
                <p className="text-lg font-bold">{payments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem 
          ? `${t('edit')} ${language === 'ar' ? 'دفعة مقاول' : 'SC Payment'}` 
          : `${t('add')} ${language === 'ar' ? 'دفعة مقاول' : 'SC Payment'}`
        }
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'عقد الباطن' : 'Subcontract'} *</Label>
            <Select
              value={formData.subcontract_id}
              onValueChange={handleSubcontractChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                {subcontracts.map(sc => {
                  const sub = businessPartners.find(bp => bp.id === sc.subcontractor_id);
                  return (
                    <SelectItem key={sc.id} value={sc.id}>
                      {sc.subcontract_number} - {sub ? getLocalizedName(sub, language, 'bp_name_ar', 'bp_name_en') : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المستخلص' : 'IPC'}</Label>
            <Select
              value={formData.ipc_id}
              onValueChange={handleIPCSelect}
              disabled={!formData.subcontract_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                {filteredIPCs.map(ipc => (
                  <SelectItem key={ipc.id} value={ipc.id}>
                    {ipc.ipc_number} - {formatCurrency(ipc.net_payable_amount, 'EGP')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'رقم الدفعة' : 'Payment Number'} *</Label>
            <Input
              value={formData.payment_number}
              onChange={(e) => setFormData({ ...formData, payment_number: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'تاريخ الدفعة' : 'Payment Date'} *</Label>
            <Input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'نوع الدفعة' : 'Payment Type'} *</Label>
            <Select
              value={formData.payment_type}
              onValueChange={(value) => setFormData({ ...formData, payment_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(paymentTypeLabels[language]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'} *</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(paymentMethodLabels[language]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.payment_method !== 'cash' && (
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الحساب البنكي' : 'Bank Account'}</Label>
              <Select
                value={formData.bank_account_id}
                onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectAll')} />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_name} - {acc.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.payment_method === 'check' && (
            <>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'رقم الشيك' : 'Check Number'}</Label>
                <Input
                  value={formData.check_number}
                  onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'تاريخ الشيك' : 'Check Date'}</Label>
                <Input
                  type="date"
                  value={formData.check_date}
                  onChange={(e) => setFormData({ ...formData, check_date: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المبلغ الإجمالي' : 'Gross Amount'} *</Label>
            <Input
              type="number"
              value={formData.gross_amount}
              onChange={(e) => setFormData({ ...formData, gross_amount: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'ضريبة الخصم' : 'Tax Deduction'}</Label>
            <Input
              type="number"
              value={formData.tax_deduction}
              onChange={(e) => setFormData({ ...formData, tax_deduction: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'خصومات أخرى' : 'Other Deductions'}</Label>
            <Input
              type="number"
              value={formData.other_deductions}
              onChange={(e) => setFormData({ ...formData, other_deductions: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'صافي المبلغ' : 'Net Amount'}</Label>
            <Input
              type="number"
              value={formData.net_amount}
              disabled
              className="bg-slate-50 font-bold text-green-600"
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المرجع' : 'Reference'}</Label>
            <Input
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
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
                <SelectItem value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</SelectItem>
                <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>{t('notes')}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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