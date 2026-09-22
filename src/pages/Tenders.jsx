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
  tender_number: '',
  tender_name: '',
  client_id: '',
  consultant_id: '',
  tender_type: 'public',
  submission_date: '',
  opening_date: '',
  estimated_value: '',
  bid_bond_required: false,
  bid_bond_amount: '',
  status: 'draft',
  notes: ''
};

export default function Tenders() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const companyFilter = currentCompany ? { company_id: currentCompany.id } : {};

  const { data: tenders = [], isLoading } = useQuery({
    queryKey: ['tenders', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.Tender.filter(companyFilter) : base44.entities.Tender.list(),
  });

  const { data: bps = [] } = useQuery({
    queryKey: ['bps', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.BusinessPartner.filter(companyFilter) : base44.entities.BusinessPartner.list(),
  });

  const clients = bps.filter(bp => bp.is_client);
  const consultants = bps.filter(bp => bp.is_consultant);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Tender.create({ ...data, company_id: currentCompany?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
      setShowModal(false);
      toast.success(language === 'ar' ? 'تم إنشاء المناقصة بنجاح' : 'Tender created successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Tender.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
      setShowModal(false);
      toast.success(language === 'ar' ? 'تم تحديث المناقصة بنجاح' : 'Tender updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Tender.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
      setShowDelete(false);
      toast.success(language === 'ar' ? 'تم حذف المناقصة بنجاح' : 'Tender deleted successfully');
    },
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ ...initialFormData, tender_number: `TND-${Date.now().toString().slice(-6)}` });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      tender_number: item.tender_number || '',
      tender_name: item.tender_name || '',
      client_id: item.client_id || '',
      consultant_id: item.consultant_id || '',
      tender_type: item.tender_type || 'public',
      submission_date: item.submission_date || '',
      opening_date: item.opening_date || '',
      estimated_value: item.estimated_value || '',
      bid_bond_required: item.bid_bond_required || false,
      bid_bond_amount: item.bid_bond_amount || '',
      status: item.status || 'draft',
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = (item) => {
    setEditingItem(item);
    setShowDelete(true);
  };

  const handleSave = () => {
    const data = {
      ...formData,
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
      bid_bond_amount: formData.bid_bond_amount ? parseFloat(formData.bid_bond_amount) : null,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const statusLabels = {
    draft: { ar: 'مسودة', en: 'Draft' },
    under_study: { ar: 'قيد الدراسة', en: 'Under Study' },
    submitted: { ar: 'مقدم', en: 'Submitted' },
    won: { ar: 'فائز', en: 'Won' },
    lost: { ar: 'خاسر', en: 'Lost' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' },
  };

  const typeLabels = {
    public: { ar: 'عامة', en: 'Public' },
    private: { ar: 'خاصة', en: 'Private' },
    direct_award: { ar: 'أمر مباشر', en: 'Direct Award' },
  };

  const columns = [
    {
      header: language === 'ar' ? 'رقم المناقصة' : 'Tender No.',
      accessor: 'tender_number',
      render: (value, row) => (
        <Link to={createPageUrl('TenderDetails') + `?id=${row.id}`} className="text-blue-600 hover:underline font-medium">
          {value}
        </Link>
      )
    },
    {
      header: language === 'ar' ? 'اسم المناقصة' : 'Tender Name',
      accessor: 'tender_name',
    },
    {
      header: language === 'ar' ? 'العميل' : 'Client',
      accessor: 'client_id',
      render: (value) => {
        const client = clients.find(c => c.id === value);
        return client ? (language === 'ar' ? client.bp_name_ar : client.bp_name_en) : '-';
      }
    },
    {
      header: language === 'ar' ? 'النوع' : 'Type',
      accessor: 'tender_type',
      render: (value) => typeLabels[value]?.[language] || value
    },
    {
      header: language === 'ar' ? 'تاريخ التقديم' : 'Submission Date',
      accessor: 'submission_date',
      render: (value) => formatDate(value)
    },
    {
      header: language === 'ar' ? 'القيمة التقديرية' : 'Estimated Value',
      accessor: 'estimated_value',
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
        title={language === 'ar' ? 'المناقصات' : 'Tenders'}
        subtitle={language === 'ar' ? 'إدارة المناقصات والعروض' : 'Manage tenders and bids'}
        onAdd={handleAdd}
        addLabel={language === 'ar' ? 'مناقصة جديدة' : 'New Tender'}
      />

      <DataTable
        data={tenders}
        columns={columns}
        isLoading={isLoading}
        searchable
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <FormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? (language === 'ar' ? 'تعديل مناقصة' : 'Edit Tender') : (language === 'ar' ? 'مناقصة جديدة' : 'New Tender')}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'رقم المناقصة' : 'Tender Number'}</Label>
            <Input
              value={formData.tender_number}
              onChange={(e) => setFormData({ ...formData, tender_number: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
            <Select value={formData.tender_type} onValueChange={(v) => setFormData({ ...formData, tender_type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label[language]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>{language === 'ar' ? 'اسم المناقصة' : 'Tender Name'}</Label>
            <Input
              value={formData.tender_name}
              onChange={(e) => setFormData({ ...formData, tender_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'العميل' : 'Client'}</Label>
            <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر العميل' : 'Select Client'} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {language === 'ar' ? client.bp_name_ar : client.bp_name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الاستشاري' : 'Consultant'}</Label>
            <Select value={formData.consultant_id} onValueChange={(v) => setFormData({ ...formData, consultant_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر الاستشاري' : 'Select Consultant'} />
              </SelectTrigger>
              <SelectContent>
                {consultants.map((consultant) => (
                  <SelectItem key={consultant.id} value={consultant.id}>
                    {language === 'ar' ? consultant.bp_name_ar : consultant.bp_name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'تاريخ التقديم' : 'Submission Date'}</Label>
            <Input
              type="date"
              value={formData.submission_date}
              onChange={(e) => setFormData({ ...formData, submission_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'تاريخ الفتح' : 'Opening Date'}</Label>
            <Input
              type="date"
              value={formData.opening_date}
              onChange={(e) => setFormData({ ...formData, opening_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'القيمة التقديرية' : 'Estimated Value'}</Label>
            <Input
              type="number"
              value={formData.estimated_value}
              onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label[language]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
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