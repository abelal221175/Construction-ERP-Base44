import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import BOQItemSelector from '@/components/shared/BOQItemSelector';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate, formatPercentage, getLocalizedName } from '@/components/shared/formatters';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPageUrl } from '@/utils';
import { FileText, Wallet, ClipboardList, Building2, Calendar, TrendingUp, AlertCircle } from 'lucide-react';

const initialFormData = {
  subcontract_number: '',
  subcontractor_id: '',
  project_id: '',
  boq_id: '',
  work_category_id: '',
  contract_date: '',
  start_date: '',
  end_date: '',
  original_value: '',
  retention_percentage: 10,
  advance_payment_percentage: 0,
  performance_bond_percentage: 5,
  vat_percentage: 14,
  insurance_required: false,
  insurance_policy_number: '',
  insurance_expiry_date: '',
  scope_ar: '',
  scope_en: '',
  terms_ar: '',
  terms_en: '',
  status: 'draft',
  notes_ar: '',
  notes_en: '',
};

export default function Subcontracts() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailView, setDetailView] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: subcontracts = [], isLoading } = useQuery({
    queryKey: ['subcontracts', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Subcontract.filter({ company_id: currentCompany.id })
      : base44.entities.Subcontract.list(),
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

  const { data: workCategories = [] } = useQuery({
    queryKey: ['workCategories', currentCompany?.id],
    queryFn: () => base44.entities.WorkCategory.list(),
  });

  const { data: ipcs = [] } = useQuery({
    queryKey: ['subcontractorIPCs', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.SubcontractorIPC.filter({ company_id: currentCompany.id })
      : base44.entities.SubcontractorIPC.list(),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['subcontractorPayments', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.SubcontractorPayment.filter({ company_id: currentCompany.id })
      : base44.entities.SubcontractorPayment.list(),
  });

  const subcontractors = businessPartners.filter(bp => bp.is_subcontractor);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Subcontract.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontracts'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Subcontract.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontracts'] });
      setModalOpen(false);
      setDetailView(null);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Subcontract.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontracts'] });
      setDeleteOpen(false);
      toast.success(t('deletedSuccessfully'));
    },
  });

  const handleAdd = () => {
    setEditingItem(null);
    const nextNum = subcontracts.length + 1;
    setFormData({ 
      ...initialFormData, 
      company_id: currentCompany?.id,
      subcontract_number: `SC-${String(nextNum).padStart(4, '0')}`,
    });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      ...initialFormData,
      ...item,
      contract_date: item.contract_date?.split('T')[0] || '',
      start_date: item.start_date?.split('T')[0] || '',
      end_date: item.end_date?.split('T')[0] || '',
      insurance_expiry_date: item.insurance_expiry_date?.split('T')[0] || '',
      boq_id: item.boq_id || '',
    });
    setModalOpen(true);
  };

  const handleDelete = (item) => {
    setEditingItem(item);
    setDeleteOpen(true);
  };

  const handleView = (item) => {
    setDetailView(item);
  };

  const handleSave = () => {
    const dataToSave = {
      ...formData,
      company_id: currentCompany?.id,
      original_value: parseFloat(formData.original_value) || 0,
      current_value: (parseFloat(formData.original_value) || 0) + (parseFloat(formData.variation_amount) || 0),
      performance_bond_amount: (parseFloat(formData.original_value) || 0) * (parseFloat(formData.performance_bond_percentage) || 0) / 100,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  // Get subcontract statistics
  const getSubcontractStats = (subcontract) => {
    const scIPCs = ipcs.filter(ipc => ipc.subcontract_id === subcontract.id);
    const scPayments = payments.filter(p => p.subcontract_id === subcontract.id);
    
    const totalCertified = scIPCs.reduce((sum, ipc) => sum + (ipc.cumulative_gross_amount || 0), 0);
    const totalPaid = scPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.net_amount || 0), 0);
    const completionPct = subcontract.current_value > 0 ? (totalCertified / subcontract.current_value) * 100 : 0;
    
    return { totalCertified, totalPaid, completionPct, ipcCount: scIPCs.length };
  };

  const columns = [
    {
      header: language === 'ar' ? 'رقم العقد' : 'Contract No.',
      accessor: 'subcontract_number',
      sortable: true,
      render: (value, row) => (
        <button 
          onClick={() => handleView(row)}
          className="text-blue-600 hover:underline font-medium"
        >
          {value}
        </button>
      ),
    },
    {
      header: language === 'ar' ? 'المقاول' : 'Subcontractor',
      accessor: 'subcontractor_id',
      render: (value) => {
        const sub = businessPartners.find(bp => bp.id === value);
        return sub ? getLocalizedName(sub, language, 'bp_name_ar', 'bp_name_en') : '-';
      },
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
      header: language === 'ar' ? 'قيمة العقد' : 'Contract Value',
      accessor: 'current_value',
      render: (value, row) => formatCurrency(value || row.original_value, 'EGP'),
    },
    {
      header: language === 'ar' ? 'المعتمد' : 'Certified',
      accessor: 'certified_amount',
      render: (value, row) => {
        const stats = getSubcontractStats(row);
        return formatCurrency(stats.totalCertified, 'EGP');
      },
    },
    {
      header: language === 'ar' ? 'الإنجاز' : 'Progress',
      accessor: 'progress',
      render: (_, row) => {
        const stats = getSubcontractStats(row);
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${Math.min(stats.completionPct, 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-600">{stats.completionPct.toFixed(0)}%</span>
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

  // Detail View Component
  if (detailView) {
    const sub = businessPartners.find(bp => bp.id === detailView.subcontractor_id);
    const project = projects.find(p => p.id === detailView.project_id);
    const stats = getSubcontractStats(detailView);
    const scIPCs = ipcs.filter(ipc => ipc.subcontract_id === detailView.id);
    const scPayments = payments.filter(p => p.subcontract_id === detailView.id);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => setDetailView(null)} className="mb-2">
              ← {t('back')}
            </Button>
            <h1 className="text-2xl font-bold">{detailView.subcontract_number}</h1>
            <p className="text-slate-500">
              {sub ? getLocalizedName(sub, language, 'bp_name_ar', 'bp_name_en') : ''} | {project?.project_code}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleEdit(detailView)}>
              {t('edit')}
            </Button>
            <Link to={createPageUrl('SubcontractorIPC') + `?subcontract_id=${detailView.id}`}>
              <Button>{language === 'ar' ? 'إنشاء مستخلص' : 'Create IPC'}</Button>
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{language === 'ar' ? 'قيمة العقد' : 'Contract Value'}</p>
                  <p className="text-lg font-bold">{formatCurrency(detailView.current_value || detailView.original_value, 'EGP')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ClipboardList className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{language === 'ar' ? 'المعتمد' : 'Certified'}</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalCertified, 'EGP')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Wallet className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{language === 'ar' ? 'المدفوع' : 'Paid'}</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalPaid, 'EGP')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{language === 'ar' ? 'نسبة الإنجاز' : 'Completion'}</p>
                  <p className="text-lg font-bold">{stats.completionPct.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details">{language === 'ar' ? 'التفاصيل' : 'Details'}</TabsTrigger>
            <TabsTrigger value="ipcs">{language === 'ar' ? 'المستخلصات' : 'IPCs'} ({scIPCs.length})</TabsTrigger>
            <TabsTrigger value="payments">{language === 'ar' ? 'المدفوعات' : 'Payments'} ({scPayments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4">{language === 'ar' ? 'معلومات العقد' : 'Contract Info'}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('contractDate')}</span>
                        <span>{formatDate(detailView.contract_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('startDate')}</span>
                        <span>{formatDate(detailView.start_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('endDate')}</span>
                        <span>{formatDate(detailView.end_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('status')}</span>
                        <StatusBadge status={detailView.status} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-4">{language === 'ar' ? 'القيم المالية' : 'Financial Values'}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{language === 'ar' ? 'القيمة الأصلية' : 'Original Value'}</span>
                        <span>{formatCurrency(detailView.original_value, 'EGP')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{language === 'ar' ? 'التغييرات' : 'Variations'}</span>
                        <span>{formatCurrency(detailView.variation_amount || 0, 'EGP')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('retention')}</span>
                        <span>{formatPercentage(detailView.retention_percentage)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('vat')}</span>
                        <span>{formatPercentage(detailView.vat_percentage)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-4">{language === 'ar' ? 'الضمانات' : 'Bonds & Insurance'}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{language === 'ar' ? 'ضمان حسن التنفيذ' : 'Perf. Bond'}</span>
                        <span>{formatPercentage(detailView.performance_bond_percentage)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{language === 'ar' ? 'الدفعة المقدمة' : 'Advance'}</span>
                        <span>{formatPercentage(detailView.advance_payment_percentage)}</span>
                      </div>
                      {detailView.insurance_required && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-500">{language === 'ar' ? 'بوليصة التأمين' : 'Insurance Policy'}</span>
                            <span>{detailView.insurance_policy_number || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">{language === 'ar' ? 'انتهاء التأمين' : 'Insurance Expiry'}</span>
                            <span>{formatDate(detailView.insurance_expiry_date)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {(detailView.scope_ar || detailView.scope_en) && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold mb-2">{language === 'ar' ? 'نطاق العمل' : 'Scope of Work'}</h3>
                    <p className="text-sm text-slate-600">{language === 'ar' ? detailView.scope_ar : detailView.scope_en}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ipcs">
            <Card>
              <CardContent className="pt-6">
                {scIPCs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    {language === 'ar' ? 'لا توجد مستخلصات' : 'No IPCs yet'}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">{t('ipcNumber')}</th>
                        <th className="text-left py-2">{t('date')}</th>
                        <th className="text-right py-2">{t('currentAmount')}</th>
                        <th className="text-right py-2">{t('netPayable')}</th>
                        <th className="text-center py-2">{t('status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scIPCs.map(ipc => (
                        <tr key={ipc.id} className="border-b hover:bg-slate-50">
                          <td className="py-2">{ipc.ipc_number}</td>
                          <td className="py-2">{formatDate(ipc.ipc_date)}</td>
                          <td className="py-2 text-right">{formatCurrency(ipc.current_gross_amount, 'EGP')}</td>
                          <td className="py-2 text-right">{formatCurrency(ipc.net_payable_amount, 'EGP')}</td>
                          <td className="py-2 text-center"><StatusBadge status={ipc.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardContent className="pt-6">
                {scPayments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    {language === 'ar' ? 'لا توجد مدفوعات' : 'No payments yet'}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">{language === 'ar' ? 'رقم الدفعة' : 'Payment No.'}</th>
                        <th className="text-left py-2">{t('date')}</th>
                        <th className="text-left py-2">{language === 'ar' ? 'النوع' : 'Type'}</th>
                        <th className="text-right py-2">{t('amount')}</th>
                        <th className="text-center py-2">{t('status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scPayments.map(payment => (
                        <tr key={payment.id} className="border-b hover:bg-slate-50">
                          <td className="py-2">{payment.payment_number}</td>
                          <td className="py-2">{formatDate(payment.payment_date)}</td>
                          <td className="py-2">
                            <Badge variant="outline">
                              {payment.payment_type === 'advance' ? (language === 'ar' ? 'دفعة مقدمة' : 'Advance') :
                               payment.payment_type === 'progress' ? (language === 'ar' ? 'دفعة تشغيلية' : 'Progress') :
                               payment.payment_type === 'retention_release' ? (language === 'ar' ? 'تحرير ضمان' : 'Retention Release') :
                               (language === 'ar' ? 'ختامي' : 'Final')}
                            </Badge>
                          </td>
                          <td className="py-2 text-right">{formatCurrency(payment.net_amount, 'EGP')}</td>
                          <td className="py-2 text-center"><StatusBadge status={payment.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('subcontracts')}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'عقد باطن' : 'Subcontract'}`}
      />

      <DataTable
        columns={columns}
        data={subcontracts}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `${t('edit')} ${t('subcontracts')}` : `${t('add')} ${t('subcontracts')}`}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="xl"
      >
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="basic">{language === 'ar' ? 'البيانات الأساسية' : 'Basic Info'}</TabsTrigger>
            <TabsTrigger value="financial">{language === 'ar' ? 'البيانات المالية' : 'Financial'}</TabsTrigger>
            <TabsTrigger value="bonds">{language === 'ar' ? 'الضمانات' : 'Bonds & Insurance'}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'رقم العقد' : 'Contract Number'} *</Label>
                <Input
                  value={formData.subcontract_number}
                  onChange={(e) => setFormData({ ...formData, subcontract_number: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'المقاول' : 'Subcontractor'} *</Label>
                <Select
                  value={formData.subcontractor_id}
                  onValueChange={(value) => setFormData({ ...formData, subcontractor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectAll')} />
                  </SelectTrigger>
                  <SelectContent>
                    {subcontractors.map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {getLocalizedName(sub, language, 'bp_name_ar', 'bp_name_en')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('project')} *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value, boq_id: '' })}
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

              {formData.project_id && (
                <div className="md:col-span-2">
                  <BOQItemSelector
                    projectId={formData.project_id}
                    selectedBOQId={formData.boq_id}
                    onBOQChange={(boqId) => setFormData({ ...formData, boq_id: boqId })}
                    filterCostTypes={['subcontractor', 'labor']}
                    showRecommendations={true}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'فئة العمل' : 'Work Category'}</Label>
                <Select
                  value={formData.work_category_id}
                  onValueChange={(value) => setFormData({ ...formData, work_category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectAll')} />
                  </SelectTrigger>
                  <SelectContent>
                    {workCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {getLocalizedName(cat, language, 'name_ar', 'name_en')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <SelectItem value="active">{t('active')}</SelectItem>
                    <SelectItem value="on_hold">{language === 'ar' ? 'معلق' : 'On Hold'}</SelectItem>
                    <SelectItem value="completed">{t('completed')}</SelectItem>
                    <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('startDate')}</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('endDate')}</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>{language === 'ar' ? 'نطاق العمل' : 'Scope of Work'}</Label>
                <Textarea
                  value={language === 'ar' ? formData.scope_ar : formData.scope_en}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    [language === 'ar' ? 'scope_ar' : 'scope_en']: e.target.value 
                  })}
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financial">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'قيمة العقد' : 'Contract Value'} *</Label>
                <Input
                  type="number"
                  value={formData.original_value}
                  onChange={(e) => setFormData({ ...formData, original_value: e.target.value })}
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

              <div className="space-y-2 md:col-span-2">
                <Label>{language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}</Label>
                <Textarea
                  value={language === 'ar' ? formData.terms_ar : formData.terms_en}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    [language === 'ar' ? 'terms_ar' : 'terms_en']: e.target.value 
                  })}
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bonds">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'ضمان حسن التنفيذ %' : 'Performance Bond %'}</Label>
                <Input
                  type="number"
                  value={formData.performance_bond_percentage}
                  onChange={(e) => setFormData({ ...formData, performance_bond_percentage: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'قيمة ضمان حسن التنفيذ' : 'Performance Bond Amount'}</Label>
                <Input
                  type="number"
                  value={(parseFloat(formData.original_value) || 0) * (parseFloat(formData.performance_bond_percentage) || 0) / 100}
                  disabled
                  className="bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.insurance_required}
                    onChange={(e) => setFormData({ ...formData, insurance_required: e.target.checked })}
                    className="rounded"
                  />
                  {language === 'ar' ? 'تأمين مطلوب' : 'Insurance Required'}
                </Label>
              </div>

              {formData.insurance_required && (
                <>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'رقم بوليصة التأمين' : 'Insurance Policy Number'}</Label>
                    <Input
                      value={formData.insurance_policy_number}
                      onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'تاريخ انتهاء التأمين' : 'Insurance Expiry Date'}</Label>
                    <Input
                      type="date"
                      value={formData.insurance_expiry_date}
                      onChange={(e) => setFormData({ ...formData, insurance_expiry_date: e.target.value })}
                    />
                  </div>
                </>
              )}

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
          </TabsContent>
        </Tabs>
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