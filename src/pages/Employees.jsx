import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { formatDate, formatCurrency, getLocalizedName } from '@/components/shared/formatters';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  employee_code: '',
  employee_name_ar: '',
  employee_name_en: '',
  national_id: '',
  department_id: '',
  job_title_ar: '',
  job_title_en: '',
  hire_date: '',
  phone: '',
  email: '',
  social_insurance_number: '',
  basic_salary: '',
  current_project_id: '',
  is_active: true,
};

export default function Employees() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Employee.filter({ company_id: currentCompany.id })
      : base44.entities.Employee.list(),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Department.filter({ company_id: currentCompany.id })
      : base44.entities.Department.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Project.filter({ company_id: currentCompany.id })
      : base44.entities.Project.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
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
      hire_date: item.hire_date?.split('T')[0] || '',
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

  const columns = [
    {
      header: t('code'),
      accessor: 'employee_code',
      sortable: true,
    },
    {
      header: t('name'),
      accessor: 'employee_name_ar',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium">
            {language === 'ar' ? row.employee_name_ar : row.employee_name_en}
          </p>
          <p className="text-sm text-slate-500">
            {language === 'ar' ? row.job_title_ar : row.job_title_en}
          </p>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'القسم' : 'Department',
      accessor: 'department_id',
      render: (value) => {
        const dept = departments.find(d => d.id === value);
        return dept ? getLocalizedName(dept, language, 'department_name_ar', 'department_name_en') : '-';
      },
    },
    {
      header: t('phone'),
      accessor: 'phone',
    },
    {
      header: language === 'ar' ? 'تاريخ التعيين' : 'Hire Date',
      accessor: 'hire_date',
      render: (value) => formatDate(value),
    },
    {
      header: t('status'),
      accessor: 'is_active',
      render: (value) => (
        <Badge variant="outline" className={cn(
          "border",
          value ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"
        )}>
          {value ? t('active') : t('inactive')}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('employees')}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'موظف' : 'Employee'}`}
      />

      <DataTable
        columns={columns}
        data={employees}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `${t('edit')}` : `${t('add')}`}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('code')} *</Label>
            <Input
              value={formData.employee_code}
              onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
              placeholder="EMP-001"
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الرقم القومي' : 'National ID'}</Label>
            <Input
              value={formData.national_id}
              onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('nameAr')} *</Label>
            <Input
              value={formData.employee_name_ar}
              onChange={(e) => setFormData({ ...formData, employee_name_ar: e.target.value })}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('nameEn')} *</Label>
            <Input
              value={formData.employee_name_en}
              onChange={(e) => setFormData({ ...formData, employee_name_en: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المسمى الوظيفي (عربي)' : 'Job Title (AR)'}</Label>
            <Input
              value={formData.job_title_ar}
              onChange={(e) => setFormData({ ...formData, job_title_ar: e.target.value })}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المسمى الوظيفي (إنجليزي)' : 'Job Title (EN)'}</Label>
            <Input
              value={formData.job_title_en}
              onChange={(e) => setFormData({ ...formData, job_title_en: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'القسم' : 'Department'}</Label>
            <Select
              value={formData.department_id}
              onValueChange={(value) => setFormData({ ...formData, department_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {getLocalizedName(dept, language, 'department_name_ar', 'department_name_en')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'تاريخ التعيين' : 'Hire Date'}</Label>
            <Input
              type="date"
              value={formData.hire_date}
              onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('phone')}</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('email')}</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'رقم التأمينات' : 'Social Insurance No.'}</Label>
            <Input
              value={formData.social_insurance_number}
              onChange={(e) => setFormData({ ...formData, social_insurance_number: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'}</Label>
            <Input
              type="number"
              value={formData.basic_salary}
              onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المشروع الحالي' : 'Current Project'}</Label>
            <Select
              value={formData.current_project_id}
              onValueChange={(value) => setFormData({ ...formData, current_project_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>{language === 'ar' ? 'بدون مشروع' : 'No Project'}</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_code}
                  </SelectItem>
                ))}
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