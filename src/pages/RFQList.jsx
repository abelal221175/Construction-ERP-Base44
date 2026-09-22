import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext.jsx';
import { useCompany } from '@/components/shared/CompanyContext.jsx';
import { formatDate, getStatusColor } from '@/components/shared/formatters';
import { cn } from "@/lib/utils";
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import BOQItemSelector from '@/components/shared/BOQItemSelector';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const initialFormData = {
  rfq_number: '',
  rfq_date: new Date().toISOString().split('T')[0],
  project_id: '',
  boq_id: '',
  rfq_type: 'material',
  response_deadline: '',
  status: 'draft',
  notes: ''
};

export default function RFQList() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const companyFilter = currentCompany ? { company_id: currentCompany.id } : {};

  const { data: rfqs = [], isLoading } = useQuery({
    queryKey: ['rfqs', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.RFQ.filter(companyFilter) : base44.entities.RFQ.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.Project.filter(companyFilter) : base44.entities.Project.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RFQ.create({ ...data, company_id: currentCompany?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      setShowModal(false);
      toast.success(language === 'ar' ? 'تم إنشاء طلب عرض الأسعار بنجاح' : 'RFQ created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RFQ.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      setShowModal(false);
      toast.success(language === 'ar' ? 'تم تحديث طلب عرض الأسعار' : 'RFQ updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RFQ.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      setShowDelete(false);
      toast.success(language === 'ar' ? 'تم حذف طلب عرض الأسعار' : 'RFQ deleted');
    },
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ ...initialFormData, rfq_number: `RFQ-${Date.now().toString().slice(-6)}` });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      rfq_number: item.rfq_number || '',
      rfq_date: item.rfq_date || '',
      project_id: item.project_id || '',
      boq_id: item.boq_id || '',
      response_deadline: item.response_deadline || '',
      status: item.status || 'draft',
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const statusLabels = {
    draft: { ar: 'مسودة', en: 'Draft' },
    sent: { ar: 'مرسل', en: 'Sent' },
    received: { ar: 'استلم ردود', en: 'Received' },
    evaluated: { ar: 'تم التقييم', en: 'Evaluated' },
    closed: { ar: 'مغلق', en: 'Closed' },
  };

  const columns = [
    {
      header: language === 'ar' ? 'رقم الطلب' : 'RFQ Number',
      accessor: 'rfq_number',
      render: (value, row) => (
        <Link to={createPageUrl('RFQDetails') + `?id=${row.id}`} className="text-blue-600 hover:underline font-medium">
          {value}
        </Link>
      )
    },
    {
      header: language === 'ar' ? 'التاريخ' : 'Date',
      accessor: 'rfq_date',
      render: (value) => formatDate(value)
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
      header: language === 'ar' ? 'الموعد النهائي' : 'Deadline',
      accessor: 'response_deadline',
      render: (value) => formatDate(value)
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
        title={language === 'ar' ? 'طلبات عروض الأسعار' : 'Request for Quotations'}
        subtitle={language === 'ar' ? 'إدارة طلبات عروض الأسعار من الموردين' : 'Manage vendor quotation requests'}
        onAdd={handleAdd}
        addLabel={language === 'ar' ? 'طلب جديد' : 'New RFQ'}
      />

      <DataTable
        data={rfqs}
        columns={columns}
        isLoading={isLoading}
        searchable
        onEdit={handleEdit}
        onDelete={(item) => { setEditingItem(item); setShowDelete(true); }}
      />

      <FormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? (language === 'ar' ? 'تعديل طلب' : 'Edit RFQ') : (language === 'ar' ? 'طلب جديد' : 'New RFQ')}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'رقم الطلب' : 'RFQ Number'}</Label>
              <Input value={formData.rfq_number} onChange={(e) => setFormData({ ...formData, rfq_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
              <Input type="date" value={formData.rfq_date} onChange={(e) => setFormData({ ...formData, rfq_date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المشروع' : 'Project'} *</Label>
            <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v, boq_id: '' })}>
              <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر مشروع' : 'Select Project'} /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.project_code} - {p.project_name_ar || p.project_name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع الطلب' : 'RFQ Type'}</Label>
              <Select value={formData.rfq_type} onValueChange={(v) => setFormData({ ...formData, rfq_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">{language === 'ar' ? 'مواد' : 'Materials'}</SelectItem>
                  <SelectItem value="equipment">{language === 'ar' ? 'معدات' : 'Equipment'}</SelectItem>
                  <SelectItem value="service">{language === 'ar' ? 'خدمات' : 'Services'}</SelectItem>
                  <SelectItem value="subcontractor">{language === 'ar' ? 'مقاول باطن' : 'Subcontractor'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الموعد النهائي للرد' : 'Response Deadline'}</Label>
              <Input type="date" value={formData.response_deadline} onChange={(e) => setFormData({ ...formData, response_deadline: e.target.value })} />
            </div>
          </div>
          
          {formData.project_id && (
            <BOQItemSelector
              projectId={formData.project_id}
              selectedBOQId={formData.boq_id}
              onBOQChange={(boqId) => setFormData({ ...formData, boq_id: boqId })}
              filterCostTypes={[formData.rfq_type]}
              showRecommendations={true}
            />
          )}
          <div className="grid grid-cols-2 gap-4">
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
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
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