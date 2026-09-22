import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GitBranch, Plus, Edit, Trash2, ArrowRight, User, Users, Building } from 'lucide-react';

const DOCUMENT_TYPES = [
  { key: 'purchase_requisition', ar: 'طلب شراء', en: 'Purchase Requisition' },
  { key: 'purchase_order', ar: 'أمر شراء', en: 'Purchase Order' },
  { key: 'payment_voucher', ar: 'سند صرف', en: 'Payment Voucher' },
  { key: 'receipt_voucher', ar: 'سند قبض', en: 'Receipt Voucher' },
  { key: 'journal_entry', ar: 'قيد يومية', en: 'Journal Entry' },
  { key: 'client_ipc', ar: 'مستخلص عميل', en: 'Client IPC' },
  { key: 'subcontractor_ipc', ar: 'مستخلص مقاول', en: 'Subcontractor IPC' },
  { key: 'variation_order', ar: 'أمر تغيير', en: 'Variation Order' },
];

export default function WorkflowSetup() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    document_type: '',
    template_name_ar: '',
    template_name_en: '',
    is_active: true
  });
  const [levelFormData, setLevelFormData] = useState({
    level_number: 1,
    approver_type: 'specific_user',
    approver_id: '',
    department_id: '',
    amount_from: '',
    amount_to: '',
    can_skip_below_threshold: false,
    is_active: true
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['workflowTemplates', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.WorkflowTemplate.filter({ company_id: currentCompany.id }) : [],
  });

  const { data: levels = [] } = useQuery({
    queryKey: ['workflowLevels', selectedTemplate?.id],
    queryFn: () => selectedTemplate ? base44.entities.WorkflowLevel.filter({ workflow_template_id: selectedTemplate.id }) : [],
    enabled: !!selectedTemplate,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkflowTemplate.create({ ...data, company_id: currentCompany?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowTemplates'] });
      setTemplateModalOpen(false);
      toast.success(language === 'ar' ? 'تم إنشاء القالب بنجاح' : 'Template created successfully');
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkflowTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowTemplates'] });
      setTemplateModalOpen(false);
      toast.success(language === 'ar' ? 'تم تحديث القالب' : 'Template updated');
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkflowTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowTemplates'] });
      setDeleteOpen(false);
      setSelectedTemplate(null);
      toast.success(language === 'ar' ? 'تم حذف القالب' : 'Template deleted');
    }
  });

  const createLevelMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkflowLevel.create({ ...data, workflow_template_id: selectedTemplate?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowLevels'] });
      setLevelModalOpen(false);
      toast.success(language === 'ar' ? 'تم إضافة مستوى الموافقة' : 'Approval level added');
    }
  });

  const updateLevelMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkflowLevel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowLevels'] });
      setLevelModalOpen(false);
      toast.success(language === 'ar' ? 'تم تحديث مستوى الموافقة' : 'Approval level updated');
    }
  });

  const deleteLevelMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkflowLevel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowLevels'] });
      toast.success(language === 'ar' ? 'تم حذف مستوى الموافقة' : 'Approval level deleted');
    }
  });

  const handleAddTemplate = () => {
    setEditingItem(null);
    setTemplateFormData({
      document_type: '',
      template_name_ar: '',
      template_name_en: '',
      is_active: true
    });
    setTemplateModalOpen(true);
  };

  const handleEditTemplate = (template) => {
    setEditingItem(template);
    setTemplateFormData({ ...template });
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = () => {
    if (editingItem) {
      updateTemplateMutation.mutate({ id: editingItem.id, data: templateFormData });
    } else {
      createTemplateMutation.mutate(templateFormData);
    }
  };

  const handleAddLevel = () => {
    setEditingItem(null);
    const nextLevel = levels.length > 0 ? Math.max(...levels.map(l => l.level_number)) + 1 : 1;
    setLevelFormData({
      level_number: nextLevel,
      approver_type: 'specific_user',
      approver_id: '',
      department_id: '',
      amount_from: '',
      amount_to: '',
      can_skip_below_threshold: false,
      is_active: true
    });
    setLevelModalOpen(true);
  };

  const handleEditLevel = (level) => {
    setEditingItem(level);
    setLevelFormData({ ...level });
    setLevelModalOpen(true);
  };

  const handleSaveLevel = () => {
    if (editingItem) {
      updateLevelMutation.mutate({ id: editingItem.id, data: levelFormData });
    } else {
      createLevelMutation.mutate(levelFormData);
    }
  };

  const getApproverName = (level) => {
    if (level.approver_type === 'specific_user') {
      const user = users.find(u => u.id === level.approver_id);
      return user?.full_name || '-';
    } else if (level.approver_type === 'role') {
      const role = roles.find(r => r.id === level.approver_id);
      return language === 'ar' ? role?.role_name_ar : role?.role_name_en || '-';
    } else if (level.approver_type === 'department_head') {
      const dept = departments.find(d => d.id === level.department_id);
      return `${language === 'ar' ? 'رئيس' : 'Head of'} ${language === 'ar' ? dept?.department_name_ar : dept?.department_name_en || '-'}`;
    }
    return '-';
  };

  const getApproverTypeIcon = (type) => {
    switch (type) {
      case 'specific_user': return <User className="h-4 w-4" />;
      case 'role': return <Users className="h-4 w-4" />;
      case 'department_head': return <Building className="h-4 w-4" />;
      default: return null;
    }
  };

  const sortedLevels = [...levels].sort((a, b) => a.level_number - b.level_number);

  return (
    <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader
        title={language === 'ar' ? 'إعدادات سير العمل' : 'Workflow Setup'}
        subtitle={language === 'ar' ? 'تكوين مستويات الموافقة للمستندات' : 'Configure approval levels for documents'}
        onAdd={handleAddTemplate}
        addLabel={language === 'ar' ? 'إضافة قالب' : 'Add Template'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{language === 'ar' ? 'قوالب سير العمل' : 'Workflow Templates'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.map(template => {
              const docType = DOCUMENT_TYPES.find(d => d.key === template.document_type);
              return (
                <div
                  key={template.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedTemplate?.id === template.id ? "border-blue-500 bg-blue-50" : "hover:bg-slate-50"
                  )}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {language === 'ar' ? template.template_name_ar : template.template_name_en}
                      </div>
                      <div className="text-xs text-slate-500">
                        {language === 'ar' ? docType?.ar : docType?.en}
                      </div>
                    </div>
                    <Badge className={template.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
                      {template.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                    </Badge>
                  </div>
                </div>
              );
            })}
            {templates.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                {language === 'ar' ? 'لا توجد قوالب' : 'No templates'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Levels */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">{language === 'ar' ? 'مستويات الموافقة' : 'Approval Levels'}</CardTitle>
              {selectedTemplate && (
                <p className="text-sm text-slate-500 mt-1">
                  {language === 'ar' ? selectedTemplate.template_name_ar : selectedTemplate.template_name_en}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {selectedTemplate && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleEditTemplate(selectedTemplate)}>
                    <Edit className="h-4 w-4 mr-1" />
                    {language === 'ar' ? 'تعديل' : 'Edit'}
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => { setEditingItem(selectedTemplate); setDeleteOpen(true); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={handleAddLevel} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-1" />
                    {language === 'ar' ? 'إضافة مستوى' : 'Add Level'}
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedTemplate ? (
              <div className="text-center py-12 text-slate-500">
                <GitBranch className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                {language === 'ar' ? 'اختر قالب لعرض مستويات الموافقة' : 'Select a template to view approval levels'}
              </div>
            ) : sortedLevels.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {language === 'ar' ? 'لا توجد مستويات موافقة. أضف مستوى جديد.' : 'No approval levels. Add a new level.'}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedLevels.map((level, index) => (
                  <div key={level.id} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 min-w-[300px] p-3 bg-slate-50 rounded-lg border">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                        {level.level_number}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getApproverTypeIcon(level.approver_type)}
                          <span className="font-medium text-sm">{getApproverName(level)}</span>
                        </div>
                        {(level.amount_from || level.amount_to) && (
                          <div className="text-xs text-slate-500">
                            {level.amount_from ? `${language === 'ar' ? 'من' : 'From'}: ${level.amount_from}` : ''}
                            {level.amount_from && level.amount_to ? ' - ' : ''}
                            {level.amount_to ? `${language === 'ar' ? 'إلى' : 'To'}: ${level.amount_to}` : ''}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditLevel(level)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteLevelMutation.mutate(level.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {index < sortedLevels.length - 1 && (
                      <ArrowRight className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Template Modal */}
      <FormModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title={editingItem ? (language === 'ar' ? 'تعديل القالب' : 'Edit Template') : (language === 'ar' ? 'إضافة قالب جديد' : 'Add New Template')}
        onSave={handleSaveTemplate}
        isSaving={createTemplateMutation.isPending || updateTemplateMutation.isPending}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'نوع المستند' : 'Document Type'} *</Label>
            <Select value={templateFormData.document_type} onValueChange={(v) => setTemplateFormData({ ...templateFormData, document_type: v })}>
              <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر النوع' : 'Select Type'} /></SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type.key} value={type.key}>
                    {language === 'ar' ? type.ar : type.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اسم القالب (عربي)' : 'Template Name (Arabic)'}</Label>
              <Input value={templateFormData.template_name_ar} onChange={(e) => setTemplateFormData({ ...templateFormData, template_name_ar: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اسم القالب (إنجليزي)' : 'Template Name (English)'}</Label>
              <Input value={templateFormData.template_name_en} onChange={(e) => setTemplateFormData({ ...templateFormData, template_name_en: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="template_active" checked={templateFormData.is_active} onCheckedChange={(c) => setTemplateFormData({ ...templateFormData, is_active: c })} />
            <Label htmlFor="template_active">{language === 'ar' ? 'نشط' : 'Active'}</Label>
          </div>
        </div>
      </FormModal>

      {/* Level Modal */}
      <FormModal
        open={levelModalOpen}
        onClose={() => setLevelModalOpen(false)}
        title={editingItem ? (language === 'ar' ? 'تعديل مستوى الموافقة' : 'Edit Approval Level') : (language === 'ar' ? 'إضافة مستوى موافقة' : 'Add Approval Level')}
        onSave={handleSaveLevel}
        isSaving={createLevelMutation.isPending || updateLevelMutation.isPending}
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'رقم المستوى' : 'Level Number'} *</Label>
              <Input type="number" min="1" value={levelFormData.level_number} onChange={(e) => setLevelFormData({ ...levelFormData, level_number: parseInt(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع المعتمد' : 'Approver Type'} *</Label>
              <Select value={levelFormData.approver_type} onValueChange={(v) => setLevelFormData({ ...levelFormData, approver_type: v, approver_id: '', department_id: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="specific_user">{language === 'ar' ? 'مستخدم محدد' : 'Specific User'}</SelectItem>
                  <SelectItem value="role">{language === 'ar' ? 'دور' : 'Role'}</SelectItem>
                  <SelectItem value="department_head">{language === 'ar' ? 'رئيس القسم' : 'Department Head'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {levelFormData.approver_type === 'specific_user' && (
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المستخدم' : 'User'} *</Label>
              <Select value={levelFormData.approver_id} onValueChange={(v) => setLevelFormData({ ...levelFormData, approver_id: v })}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر المستخدم' : 'Select User'} /></SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {levelFormData.approver_type === 'role' && (
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الدور' : 'Role'} *</Label>
              <Select value={levelFormData.approver_id} onValueChange={(v) => setLevelFormData({ ...levelFormData, approver_id: v })}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر الدور' : 'Select Role'} /></SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{language === 'ar' ? role.role_name_ar : role.role_name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {levelFormData.approver_type === 'department_head' && (
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'القسم' : 'Department'} *</Label>
              <Select value={levelFormData.department_id} onValueChange={(v) => setLevelFormData({ ...levelFormData, department_id: v })}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر القسم' : 'Select Department'} /></SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{language === 'ar' ? dept.department_name_ar : dept.department_name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المبلغ من' : 'Amount From'}</Label>
              <Input type="number" value={levelFormData.amount_from} onChange={(e) => setLevelFormData({ ...levelFormData, amount_from: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المبلغ إلى' : 'Amount To'}</Label>
              <Input type="number" value={levelFormData.amount_to} onChange={(e) => setLevelFormData({ ...levelFormData, amount_to: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="can_skip" checked={levelFormData.can_skip_below_threshold} onCheckedChange={(c) => setLevelFormData({ ...levelFormData, can_skip_below_threshold: c })} />
            <Label htmlFor="can_skip">{language === 'ar' ? 'تخطي إذا أقل من الحد' : 'Skip if below threshold'}</Label>
          </div>
        </div>
      </FormModal>

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteTemplateMutation.mutate(editingItem?.id)}
        isDeleting={deleteTemplateMutation.isPending}
      />
    </div>
  );
}