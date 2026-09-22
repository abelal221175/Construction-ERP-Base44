import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import ExportButton from '@/components/shared/ExportButton';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate, formatPercentage, getLocalizedName } from '@/components/shared/formatters';
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

const initialFormData = {
  project_code: '',
  project_name_ar: '',
  project_name_en: '',
  project_type: 'external',
  client_id: '',
  consultant_id: '',
  contract_number: '',
  contract_date: '',
  original_contract_value: '',
  discount_percentage: 0,
  start_date: '',
  original_end_date: '',
  retention_percentage: 10,
  advance_payment_percentage: 0,
  vat_percentage: 14,
  status: 'active',
};

export default function Projects() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: projects = [], isLoading } = useQuery({
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

  const clients = businessPartners.filter(bp => bp.is_client);
  const consultants = businessPartners.filter(bp => bp.is_consultant);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
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
      contract_date: item.contract_date?.split('T')[0] || '',
      start_date: item.start_date?.split('T')[0] || '',
      original_end_date: item.original_end_date?.split('T')[0] || '',
    });
    setModalOpen(true);
  };

  const handleDelete = (item) => {
    setEditingItem(item);
    setDeleteOpen(true);
  };

  const handleSave = () => {
    const discountAmount = (parseFloat(formData.original_contract_value) || 0) * 
      (parseFloat(formData.discount_percentage) || 0) / 100;
    const netValue = (parseFloat(formData.original_contract_value) || 0) - discountAmount;
    
    const dataToSave = {
      ...formData,
      company_id: currentCompany?.id,
      discount_amount: discountAmount,
      net_contract_value: netValue,
      current_contract_value: netValue + (parseFloat(formData.variation_amount) || 0),
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const columns = [
    {
      header: t('code'),
      accessor: 'project_code',
      sortable: true,
      render: (value, row) => (
        <Link to={createPageUrl('ProjectDetails') + `?id=${row.id}`} className="text-blue-600 hover:underline font-medium">
          {value}
        </Link>
      ),
    },
    {
      header: t('projectName'),
      accessor: 'project_name_ar',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium">
            {language === 'ar' ? row.project_name_ar : row.project_name_en}
          </p>
          <p className="text-sm text-slate-500">
            {language === 'ar' ? row.project_name_en : row.project_name_ar}
          </p>
        </div>
      ),
    },
    {
      header: t('client'),
      accessor: 'client_id',
      render: (value) => {
        const client = businessPartners.find(bp => bp.id === value);
        return client ? getLocalizedName(client, language, 'bp_name_ar', 'bp_name_en') : '-';
      },
    },
    {
      header: t('contractValue'),
      accessor: 'original_contract_value',
      render: (value) => formatCurrency(value, 'EGP'),
    },
    {
      header: t('startDate'),
      accessor: 'start_date',
      render: (value) => formatDate(value),
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
        title={t('projects')}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${t('project')}`}
      >
        <ExportButton
          data={projects}
          columns={columns}
          filename={language === 'ar' ? 'المشروعات' : 'Projects'}
        />
      </PageHeader>

      <DataTable
        columns={columns}
        data={projects}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `${t('edit')} ${t('project')}` : `${t('add')} ${t('project')}`}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('code')} *</Label>
            <Input
              value={formData.project_code}
              onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
              placeholder="PRJ-001"
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
            <Select
              value={formData.project_type}
              onValueChange={(value) => setFormData({ ...formData, project_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="external">{language === 'ar' ? 'خارجي' : 'External'}</SelectItem>
                <SelectItem value="internal_capex">{language === 'ar' ? 'داخلي - رأسمالي' : 'Internal - CapEx'}</SelectItem>
                <SelectItem value="internal_opex">{language === 'ar' ? 'داخلي - تشغيلي' : 'Internal - OpEx'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('nameAr')} *</Label>
            <Input
              value={formData.project_name_ar}
              onChange={(e) => setFormData({ ...formData, project_name_ar: e.target.value })}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('nameEn')} *</Label>
            <Input
              value={formData.project_name_en}
              onChange={(e) => setFormData({ ...formData, project_name_en: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('client')} *</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
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
            <Label>{t('consultant')}</Label>
            <Select
              value={formData.consultant_id}
              onValueChange={(value) => setFormData({ ...formData, consultant_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                {consultants.map(consultant => (
                  <SelectItem key={consultant.id} value={consultant.id}>
                    {getLocalizedName(consultant, language, 'bp_name_ar', 'bp_name_en')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'رقم العقد' : 'Contract Number'}</Label>
            <Input
              value={formData.contract_number}
              onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('contractDate')} *</Label>
            <Input
              type="date"
              value={formData.contract_date}
              onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('contractValue')} *</Label>
            <Input
              type="number"
              value={formData.original_contract_value}
              onChange={(e) => setFormData({ ...formData, original_contract_value: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'نسبة الخصم %' : 'Discount %'}</Label>
            <Input
              type="number"
              value={formData.discount_percentage}
              onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('startDate')} *</Label>
            <Input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('endDate')} *</Label>
            <Input
              type="date"
              value={formData.original_end_date}
              onChange={(e) => setFormData({ ...formData, original_end_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('retention')} %</Label>
            <Input
              type="number"
              value={formData.retention_percentage}
              onChange={(e) => setFormData({ ...formData, retention_percentage: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('advance')} %</Label>
            <Input
              type="number"
              value={formData.advance_payment_percentage}
              onChange={(e) => setFormData({ ...formData, advance_payment_percentage: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('vat')} %</Label>
            <Input
              type="number"
              value={formData.vat_percentage}
              onChange={(e) => setFormData({ ...formData, vat_percentage: e.target.value })}
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
                <SelectItem value="on_hold">{language === 'ar' ? 'معلق' : 'On Hold'}</SelectItem>
                <SelectItem value="completed">{t('completed')}</SelectItem>
                <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
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