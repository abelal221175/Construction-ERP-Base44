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
import { formatCurrency, formatDate, getLocalizedName } from '@/components/shared/formatters';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const initialFormData = {
  lg_number: '',
  lg_type: 'performance',
  project_id: '',
  bank_id: '',
  beneficiary_id: '',
  amount: '',
  currency: 'EGP',
  issue_date: '',
  expiry_date: '',
  margin_percentage: '',
  margin_amount: '',
  commission_rate: '',
  commission_amount: '',
  status: 'active',
  notes_ar: '',
  notes_en: '',
};

const lgTypeLabels = {
  ar: {
    bid_bond: 'ضمان ابتدائي',
    performance: 'ضمان حسن التنفيذ',
    advance_payment: 'ضمان الدفعة المقدمة',
    retention: 'ضمان المحجوز',
  },
  en: {
    bid_bond: 'Bid Bond',
    performance: 'Performance',
    advance_payment: 'Advance Payment',
    retention: 'Retention',
  }
};

export default function LettersOfGuarantee() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: lgs = [], isLoading } = useQuery({
    queryKey: ['lettersOfGuarantee', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.LetterOfGuarantee.filter({ company_id: currentCompany.id })
      : base44.entities.LetterOfGuarantee.list(),
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

  const banks = businessPartners.filter(bp => bp.is_bank);
  const clients = businessPartners.filter(bp => bp.is_client);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LetterOfGuarantee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettersOfGuarantee'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LetterOfGuarantee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettersOfGuarantee'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LetterOfGuarantee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettersOfGuarantee'] });
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
    setFormData({
      ...initialFormData,
      ...item,
      issue_date: item.issue_date?.split('T')[0] || '',
      expiry_date: item.expiry_date?.split('T')[0] || '',
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

  // Check if LG is expiring soon
  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntil = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return 'expired';
    if (daysUntil <= 30) return 'expiring';
    return 'valid';
  };

  const columns = [
    {
      header: language === 'ar' ? 'رقم الخطاب' : 'LG Number',
      accessor: 'lg_number',
      sortable: true,
    },
    {
      header: language === 'ar' ? 'النوع' : 'Type',
      accessor: 'lg_type',
      render: (value) => (
        <Badge variant="outline" className="border bg-slate-50">
          {lgTypeLabels[language][value] || value}
        </Badge>
      ),
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
      header: language === 'ar' ? 'البنك' : 'Bank',
      accessor: 'bank_id',
      render: (value) => {
        const bank = businessPartners.find(bp => bp.id === value);
        return bank ? getLocalizedName(bank, language, 'bp_name_ar', 'bp_name_en') : '-';
      },
    },
    {
      header: t('amount'),
      accessor: 'amount',
      render: (value, row) => formatCurrency(value, row.currency || 'EGP'),
    },
    {
      header: language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date',
      accessor: 'expiry_date',
      render: (value) => {
        const status = getExpiryStatus(value);
        return (
          <div className={cn(
            "font-mono",
            status === 'expired' && "text-red-600",
            status === 'expiring' && "text-amber-600"
          )}>
            {formatDate(value)}
            {status === 'expiring' && ' ⚠️'}
            {status === 'expired' && ' ❌'}
          </div>
        );
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
        title={t('lettersOfGuarantee')}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'خطاب ضمان' : 'LG'}`}
      />

      <DataTable
        columns={columns}
        data={lgs}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `${t('edit')} ${t('lettersOfGuarantee')}` : `${t('add')} ${t('lettersOfGuarantee')}`}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'رقم الخطاب' : 'LG Number'} *</Label>
            <Input
              value={formData.lg_number}
              onChange={(e) => setFormData({ ...formData, lg_number: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'النوع' : 'Type'} *</Label>
            <Select
              value={formData.lg_type}
              onValueChange={(value) => setFormData({ ...formData, lg_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bid_bond">{lgTypeLabels[language].bid_bond}</SelectItem>
                <SelectItem value="performance">{lgTypeLabels[language].performance}</SelectItem>
                <SelectItem value="advance_payment">{lgTypeLabels[language].advance_payment}</SelectItem>
                <SelectItem value="retention">{lgTypeLabels[language].retention}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('project')}</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_code} - {getLocalizedName(project, language, 'project_name_ar', 'project_name_en')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'البنك' : 'Bank'} *</Label>
            <Select
              value={formData.bank_id}
              onValueChange={(value) => setFormData({ ...formData, bank_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                {banks.map(bank => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {getLocalizedName(bank, language, 'bp_name_ar', 'bp_name_en')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المستفيد' : 'Beneficiary'} *</Label>
            <Select
              value={formData.beneficiary_id}
              onValueChange={(value) => setFormData({ ...formData, beneficiary_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {getLocalizedName(client, language, 'bp_name_ar', 'bp_name_en')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('amount')} *</Label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'} *</Label>
            <Input
              type="date"
              value={formData.issue_date}
              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'} *</Label>
            <Input
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'نسبة الهامش %' : 'Margin %'}</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.margin_percentage}
              onChange={(e) => setFormData({ ...formData, margin_percentage: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'مبلغ الهامش' : 'Margin Amount'}</Label>
            <Input
              type="number"
              value={formData.margin_amount}
              onChange={(e) => setFormData({ ...formData, margin_amount: e.target.value })}
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
                <SelectItem value="active">{t('active')}</SelectItem>
                <SelectItem value="extended">{language === 'ar' ? 'ممدد' : 'Extended'}</SelectItem>
                <SelectItem value="released">{language === 'ar' ? 'مرتجع' : 'Released'}</SelectItem>
                <SelectItem value="expired">{language === 'ar' ? 'منتهي' : 'Expired'}</SelectItem>
                <SelectItem value="claimed">{language === 'ar' ? 'مطالب به' : 'Claimed'}</SelectItem>
              </SelectContent>
            </Select>
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