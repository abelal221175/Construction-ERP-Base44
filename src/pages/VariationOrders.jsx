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
  vo_number: '',
  vo_date: new Date().toISOString().split('T')[0],
  project_id: '',
  vo_type: 'addition',
  description: '',
  reason: '',
  requested_by: 'client',
  original_amount: '',
  revised_amount: '',
  status: 'draft'
};

export default function VariationOrders() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const companyFilter = currentCompany ? { company_id: currentCompany.id } : {};

  const { data: variations = [], isLoading } = useQuery({
    queryKey: ['variationOrders', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.VariationOrder.filter(companyFilter) : base44.entities.VariationOrder.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.Project.filter(companyFilter) : base44.entities.Project.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VariationOrder.create({ ...data, company_id: currentCompany?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variationOrders'] });
      setShowModal(false);
      toast.success(language === 'ar' ? 'تم إنشاء أمر التغيير بنجاح' : 'Variation order created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VariationOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variationOrders'] });
      setShowModal(false);
      toast.success(language === 'ar' ? 'تم تحديث أمر التغيير' : 'Variation order updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VariationOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variationOrders'] });
      setShowDelete(false);
      toast.success(language === 'ar' ? 'تم حذف أمر التغيير' : 'Variation order deleted');
    },
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ ...initialFormData, vo_number: `VO-${Date.now().toString().slice(-6)}` });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      vo_number: item.vo_number || '',
      vo_date: item.vo_date || '',
      project_id: item.project_id || '',
      vo_type: item.vo_type || 'addition',
      description: item.description || '',
      reason: item.reason || '',
      requested_by: item.requested_by || 'client',
      original_amount: item.original_amount || '',
      revised_amount: item.revised_amount || '',
      status: item.status || 'draft'
    });
    setShowModal(true);
  };

  const handleSave = () => {
    const original = parseFloat(formData.original_amount) || 0;
    const revised = parseFloat(formData.revised_amount) || 0;
    
    const data = {
      ...formData,
      original_amount: original,
      revised_amount: revised,
      variation_amount: revised - original
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const typeLabels = {
    addition: { ar: 'إضافة', en: 'Addition' },
    omission: { ar: 'حذف', en: 'Omission' },
    modification: { ar: 'تعديل', en: 'Modification' },
  };

  const statusLabels = {
    draft: { ar: 'مسودة', en: 'Draft' },
    submitted: { ar: 'مقدم', en: 'Submitted' },
    under_review: { ar: 'قيد المراجعة', en: 'Under Review' },
    approved: { ar: 'معتمد', en: 'Approved' },
    rejected: { ar: 'مرفوض', en: 'Rejected' },
  };

  const columns = [
    {
      header: language === 'ar' ? 'رقم أمر التغيير' : 'VO Number',
      accessor: 'vo_number',
      render: (value, row) => (
        <Link to={createPageUrl('VariationOrderDetails') + `?id=${row.id}`} className="text-blue-600 hover:underline font-medium">
          {value}
        </Link>
      )
    },
    {
      header: language === 'ar' ? 'المشروع' : 'Project',
      accessor: 'project_id',
      render: (value) => {
        const project = projects.find(p => p.id === value);
        return project ? (project.project_name_ar || project.project_name_en) : '-';
      }
    },
    {
      header: language === 'ar' ? 'النوع' : 'Type',
      accessor: 'vo_type',
      render: (value) => (
        <Badge variant="outline">
          {typeLabels[value]?.[language] || value}
        </Badge>
      )
    },
    {
      header: language === 'ar' ? 'التاريخ' : 'Date',
      accessor: 'vo_date',
      render: (value) => formatDate(value)
    },
    {
      header: language === 'ar' ? 'قيمة التغيير' : 'Variation Amount',
      accessor: 'variation_amount',
      render: (value) => (
        <span className={value < 0 ? 'text-red-600' : 'text-green-600'}>
          {formatCurrency(value)}
        </span>
      )
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
        title={language === 'ar' ? 'أوامر التغيير' : 'Variation Orders'}
        subtitle={language === 'ar' ? 'إدارة أوامر التغيير للمشروعات' : 'Manage project variation orders'}
        onAdd={handleAdd}
        addLabel={language === 'ar' ? 'أمر تغيير جديد' : 'New VO'}
      />

      <DataTable
        data={variations}
        columns={columns}
        isLoading={isLoading}
        searchable
        onEdit={handleEdit}
        onDelete={(item) => { setEditingItem(item); setShowDelete(true); }}
      />

      <FormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? (language === 'ar' ? 'تعديل أمر تغيير' : 'Edit VO') : (language === 'ar' ? 'أمر تغيير جديد' : 'New VO')}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'رقم أمر التغيير' : 'VO Number'}</Label>
            <Input value={formData.vo_number} onChange={(e) => setFormData({ ...formData, vo_number: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
            <Input type="date" value={formData.vo_date} onChange={(e) => setFormData({ ...formData, vo_date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المشروع' : 'Project'}</Label>
            <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
              <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر مشروع' : 'Select Project'} /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.project_code} - {p.project_name_ar || p.project_name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
            <Select value={formData.vo_type} onValueChange={(v) => setFormData({ ...formData, vo_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label[language]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'القيمة الأصلية' : 'Original Amount'}</Label>
            <Input type="number" value={formData.original_amount} onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'القيمة المعدلة' : 'Revised Amount'}</Label>
            <Input type="number" value={formData.revised_amount} onChange={(e) => setFormData({ ...formData, revised_amount: e.target.value })} />
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