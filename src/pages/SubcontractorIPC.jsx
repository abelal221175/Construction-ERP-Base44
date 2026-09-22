import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate, formatNumber, formatPercentage, getLocalizedName } from '@/components/shared/formatters';
import IPCItemsGrid from '@/components/ipc/IPCItemsGrid';
import IPCDeductionsAdditions from '@/components/ipc/IPCDeductionsAdditions';
import IPCSummaryCard from '@/components/ipc/IPCSummaryCard';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Calculator, FileCheck, AlertTriangle, Link2 } from 'lucide-react';

const initialFormData = {
  subcontract_id: '',
  ipc_number: '',
  ipc_date: '',
  period_from: '',
  period_to: '',
  ipc_sequence: 1,
  contract_value: 0,
  retention_percentage: 10,
  insurance_percentage: 1,
  advance_recovery_percentage: 0,
  vat_percentage: 14,
  notes: '',
  status: 'draft',
};

export default function SubcontractorIPC() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [ipcItems, setIpcItems] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [additions, setAdditions] = useState([]);
  const [activeTab, setActiveTab] = useState('items');

  const urlParams = new URLSearchParams(window.location.search);
  const preselectedSubcontractId = urlParams.get('subcontract_id');

  const { data: ipcs = [], isLoading } = useQuery({
    queryKey: ['subcontractorIPCs', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.SubcontractorIPC.filter({ company_id: currentCompany.id })
      : base44.entities.SubcontractorIPC.list(),
  });

  const { data: subcontracts = [] } = useQuery({
    queryKey: ['subcontracts', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Subcontract.filter({ company_id: currentCompany.id })
      : base44.entities.Subcontract.list(),
  });

  const { data: businessPartners = [] } = useQuery({
    queryKey: ['businessPartners', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.BusinessPartner.filter({ company_id: currentCompany.id })
      : base44.entities.BusinessPartner.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Project.filter({ company_id: currentCompany.id })
      : base44.entities.Project.list(),
  });

  // Fetch subcontract BOQ items
  const { data: subcontractBOQs = [] } = useQuery({
    queryKey: ['subcontractBOQs', formData.subcontract_id],
    queryFn: () => formData.subcontract_id 
      ? base44.entities.SubcontractBOQ.filter({ subcontract_id: formData.subcontract_id })
      : [],
    enabled: !!formData.subcontract_id,
  });

  // Fetch previous IPC data
  const { data: previousIPCData } = useQuery({
    queryKey: ['previousSCIPCData', formData.subcontract_id, editingItem?.id],
    queryFn: async () => {
      if (!formData.subcontract_id) return { ipc: null, items: [] };
      
      const allIPCs = await base44.entities.SubcontractorIPC.filter({ subcontract_id: formData.subcontract_id });
      const sortedIPCs = allIPCs
        .filter(ipc => ipc.id !== editingItem?.id && ipc.status !== 'draft')
        .sort((a, b) => b.ipc_sequence - a.ipc_sequence);
      
      const prevIPC = sortedIPCs[0];
      if (!prevIPC) return { ipc: null, items: [] };
      
      const prevItems = await base44.entities.SubcontractorIPCItem.filter({ ipc_id: prevIPC.id });
      return { ipc: prevIPC, items: prevItems };
    },
    enabled: !!formData.subcontract_id,
  });

  // Initialize IPC items when subcontract changes
  useEffect(() => {
    if (subcontractBOQs.length > 0 && !editingItem && formData.subcontract_id) {
      const prevItems = previousIPCData?.items || [];
      
      const items = subcontractBOQs.map(boq => {
        const prevItem = prevItems.find(p => p.subcontract_boq_id === boq.id);
        return {
          subcontract_boq_id: boq.id,
          project_boq_id: boq.project_boq_id,
          item_code: boq.external_code || boq.system_code,
          item_description: boq.item_description,
          uom: boq.uom,
          boq_quantity: boq.quantity,
          contract_quantity: boq.quantity,
          unit_price: boq.unit_price,
          contract_amount: boq.total_amount,
          previous_quantity: prevItem?.cumulative_quantity || 0,
          previous_amount: prevItem?.cumulative_amount || 0,
          current_quantity: 0,
          completion_percentage: 100,
          cumulative_quantity: prevItem?.cumulative_quantity || 0,
          cumulative_amount: prevItem?.cumulative_amount || 0,
          current_amount: 0,
          sort_order: boq.sort_order || 0,
        };
      }).sort((a, b) => a.sort_order - b.sort_order);
      
      setIpcItems(items);
      
      // Initialize default deductions
      setDeductions([
        { category: 'retention', is_percentage: true, percentage: formData.retention_percentage, amount: 0 },
        { category: 'advance_recovery', is_percentage: true, percentage: formData.advance_recovery_percentage, amount: 0 },
      ]);
      setAdditions([]);
    }
  }, [subcontractBOQs, previousIPCData, editingItem, formData.subcontract_id]);

  // Calculate item values
  const calculateItem = (item, currentQty, completionPct) => {
    const prevQty = parseFloat(item.previous_quantity) || 0;
    const prevAmt = parseFloat(item.previous_amount) || 0;
    const currQty = parseFloat(currentQty) || 0;
    const compPct = parseFloat(completionPct) || 100;
    const unitPrice = parseFloat(item.unit_price) || 0;
    
    const cumulativeQty = prevQty + currQty;
    const cumulativeAmt = cumulativeQty * (compPct / 100) * unitPrice;
    const currentAmt = cumulativeAmt - prevAmt;
    
    return {
      ...item,
      current_quantity: currQty,
      completion_percentage: compPct,
      cumulative_quantity: cumulativeQty,
      cumulative_amount: cumulativeAmt,
      current_amount: currentAmt,
    };
  };

  const updateIpcItem = (index, field, value) => {
    setIpcItems(prev => {
      const newItems = [...prev];
      const item = newItems[index];
      
      if (field === 'current_quantity') {
        newItems[index] = calculateItem(item, value, item.completion_percentage);
      } else if (field === 'completion_percentage') {
        newItems[index] = calculateItem(item, item.current_quantity, value);
      }
      
      return newItems;
    });
  };

  // Calculate summary
  const summary = useMemo(() => {
    const cumulativeGross = ipcItems.reduce((sum, item) => sum + (item.cumulative_amount || 0), 0);
    const previousCertified = ipcItems.reduce((sum, item) => sum + (item.previous_amount || 0), 0);
    const currentGross = cumulativeGross - previousCertified;
    
    const updatedDeductions = deductions.map(d => {
      if (d.is_percentage && currentGross > 0) {
        return { ...d, amount: currentGross * (parseFloat(d.percentage) || 0) / 100 };
      }
      return d;
    });
    
    const totalDeductions = updatedDeductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const totalAdditions = additions.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    
    const subtotalBeforeVat = currentGross - totalDeductions + totalAdditions;
    const vatAmount = subtotalBeforeVat * (parseFloat(formData.vat_percentage) || 0) / 100;
    const netPayable = subtotalBeforeVat + vatAmount;
    
    const completionPct = formData.contract_value > 0 ? (cumulativeGross / formData.contract_value) * 100 : 0;

    return {
      cumulativeGross,
      previousCertified,
      currentGross,
      totalDeductions,
      totalAdditions,
      subtotalBeforeVat,
      vatAmount,
      netPayable,
      completionPercentage: completionPct,
      deductionsList: updatedDeductions.filter(d => d.amount > 0).map(d => ({
        label: getDeductionLabel(d.category),
        percentage: d.is_percentage ? d.percentage : null,
        amount: d.amount,
      })),
      additionsList: additions.filter(a => a.amount > 0).map(a => ({
        label: getAdditionLabel(a.category),
        amount: a.amount,
      })),
    };
  }, [ipcItems, deductions, additions, formData.vat_percentage, formData.contract_value]);

  const getDeductionLabel = (category) => {
    const labels = {
      retention: language === 'ar' ? 'ضمان الأعمال' : 'Retention',
      advance_recovery: language === 'ar' ? 'استرداد الدفعة' : 'Advance Recovery',
      penalty: language === 'ar' ? 'غرامات' : 'Penalties',
      insurance: language === 'ar' ? 'تأمين' : 'Insurance',
      backcharge: language === 'ar' ? 'مقاصة' : 'Backcharge',
      other: language === 'ar' ? 'أخرى' : 'Other',
    };
    return labels[category] || category;
  };

  const getAdditionLabel = (category) => {
    const labels = {
      variation: language === 'ar' ? 'أمر تغيير' : 'Variation',
      escalation: language === 'ar' ? 'تصعيد' : 'Escalation',
      materials_on_site: language === 'ar' ? 'مواد بالموقع' : 'Materials on Site',
      other: language === 'ar' ? 'أخرى' : 'Other',
    };
    return labels[category] || category;
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const ipc = await base44.entities.SubcontractorIPC.create({
        ...data,
        cumulative_gross_amount: summary.cumulativeGross,
        previous_certified_amount: summary.previousCertified,
        current_gross_amount: summary.currentGross,
        completion_percentage: summary.completionPercentage,
        retention_amount: deductions.find(d => d.category === 'retention')?.amount || 0,
        advance_recovery_amount: deductions.find(d => d.category === 'advance_recovery')?.amount || 0,
        total_deductions: summary.totalDeductions,
        additions: summary.totalAdditions,
        net_before_vat: summary.subtotalBeforeVat,
        vat_amount: summary.vatAmount,
        net_payable_amount: summary.netPayable,
      });
      
      // Create IPC items
      for (const item of ipcItems) {
        await base44.entities.SubcontractorIPCItem.create({
          ipc_id: ipc.id,
          ...item,
        });
      }
      
      // Update subcontract BOQ cumulative values
      for (const item of ipcItems) {
        await base44.entities.SubcontractBOQ.update(item.subcontract_boq_id, {
          cumulative_quantity: item.cumulative_quantity,
          cumulative_amount: item.cumulative_amount,
        });
      }
      
      // Create deductions/additions
      for (const d of deductions) {
        if (d.amount > 0) {
          await base44.entities.IPCDeductionAddition.create({
            ipc_id: ipc.id,
            ipc_type: 'subcontractor',
            type: 'deduction',
            ...d,
          });
        }
      }
      for (const a of additions) {
        if (a.amount > 0) {
          await base44.entities.IPCDeductionAddition.create({
            ipc_id: ipc.id,
            ipc_type: 'subcontractor',
            type: 'addition',
            ...a,
          });
        }
      }
      
      // Update subcontract certified amount
      const sc = subcontracts.find(s => s.id === data.subcontract_id);
      if (sc) {
        await base44.entities.Subcontract.update(sc.id, {
          certified_amount: summary.cumulativeGross,
        });
      }
      
      return ipc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractorIPCs'] });
      queryClient.invalidateQueries({ queryKey: ['subcontracts'] });
      queryClient.invalidateQueries({ queryKey: ['subcontractBOQs'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.SubcontractorIPC.update(id, {
        ...data,
        cumulative_gross_amount: summary.cumulativeGross,
        previous_certified_amount: summary.previousCertified,
        current_gross_amount: summary.currentGross,
        completion_percentage: summary.completionPercentage,
        retention_amount: deductions.find(d => d.category === 'retention')?.amount || 0,
        advance_recovery_amount: deductions.find(d => d.category === 'advance_recovery')?.amount || 0,
        total_deductions: summary.totalDeductions,
        additions: summary.totalAdditions,
        net_before_vat: summary.subtotalBeforeVat,
        vat_amount: summary.vatAmount,
        net_payable_amount: summary.netPayable,
      });
      
      // Update items
      const existingItems = await base44.entities.SubcontractorIPCItem.filter({ ipc_id: id });
      for (const item of existingItems) {
        await base44.entities.SubcontractorIPCItem.delete(item.id);
      }
      for (const item of ipcItems) {
        await base44.entities.SubcontractorIPCItem.create({ ipc_id: id, ...item });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractorIPCs'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const items = await base44.entities.SubcontractorIPCItem.filter({ ipc_id: id });
      for (const item of items) {
        await base44.entities.SubcontractorIPCItem.delete(item.id);
      }
      await base44.entities.SubcontractorIPC.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractorIPCs'] });
      setDeleteOpen(false);
      toast.success(t('deletedSuccessfully'));
    },
  });

  const handleAdd = () => {
    setEditingItem(null);
    const nextNum = ipcs.length + 1;
    
    let initialData = { 
      ...initialFormData, 
      company_id: currentCompany?.id,
      ipc_number: `SCIPC-${String(nextNum).padStart(3, '0')}`,
      ipc_date: new Date().toISOString().split('T')[0],
    };

    if (preselectedSubcontractId) {
      const sc = subcontracts.find(s => s.id === preselectedSubcontractId);
      if (sc) {
        const scIPCs = ipcs.filter(ipc => ipc.subcontract_id === preselectedSubcontractId);
        const nextSeq = (Math.max(...scIPCs.map(i => i.ipc_sequence || 0), 0)) + 1;
        
        initialData = {
          ...initialData,
          subcontract_id: preselectedSubcontractId,
          ipc_sequence: nextSeq,
          ipc_number: `SCIPC-${String(nextSeq).padStart(3, '0')}`,
          retention_percentage: sc.retention_percentage || 10,
          vat_percentage: sc.vat_percentage || 14,
          contract_value: sc.current_value || sc.original_value || 0,
        };
      }
    }

    setFormData(initialData);
    setIpcItems([]);
    setDeductions([]);
    setAdditions([]);
    setActiveTab('items');
    setModalOpen(true);
  };

  const handleEdit = async (item) => {
    setEditingItem(item);
    setFormData({
      ...initialFormData,
      ...item,
      ipc_date: item.ipc_date?.split('T')[0] || '',
      period_from: item.period_from?.split('T')[0] || '',
      period_to: item.period_to?.split('T')[0] || '',
    });
    
    const items = await base44.entities.SubcontractorIPCItem.filter({ ipc_id: item.id });
    setIpcItems(items);
    
    const dedAdd = await base44.entities.IPCDeductionAddition.filter({ ipc_id: item.id });
    setDeductions(dedAdd.filter(d => d.type === 'deduction'));
    setAdditions(dedAdd.filter(d => d.type === 'addition'));
    
    setActiveTab('items');
    setModalOpen(true);
  };

  const handleDelete = (item) => {
    setEditingItem(item);
    setDeleteOpen(true);
  };

  const handleSubcontractChange = (subcontractId) => {
    const sc = subcontracts.find(s => s.id === subcontractId);
    if (sc) {
      const scIPCs = ipcs.filter(ipc => ipc.subcontract_id === subcontractId);
      const nextSeq = (Math.max(...scIPCs.map(i => i.ipc_sequence || 0), 0)) + 1;
      
      setFormData(prev => ({
        ...prev,
        subcontract_id: subcontractId,
        ipc_sequence: nextSeq,
        ipc_number: `SCIPC-${String(nextSeq).padStart(3, '0')}`,
        retention_percentage: sc.retention_percentage || 10,
        vat_percentage: sc.vat_percentage || 14,
        contract_value: sc.current_value || sc.original_value || 0,
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

  const isEditable = !editingItem || editingItem.status === 'draft';
  const selectedSubcontract = subcontracts.find(s => s.id === formData.subcontract_id);
  const selectedSubcontractor = selectedSubcontract ? businessPartners.find(bp => bp.id === selectedSubcontract.subcontractor_id) : null;
  const selectedProject = selectedSubcontract ? projects.find(p => p.id === selectedSubcontract.project_id) : null;

  const columns = [
    {
      header: t('ipcNumber'),
      accessor: 'ipc_number',
      sortable: true,
      render: (value, row) => (
        <div>
          <span className="font-mono font-medium">{value}</span>
          <Badge variant="outline" className="ml-2 text-xs">#{row.ipc_sequence}</Badge>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'العقد / المقاول' : 'Contract / Subcontractor',
      accessor: 'subcontract_id',
      render: (value) => {
        const sc = subcontracts.find(s => s.id === value);
        if (!sc) return '-';
        const sub = businessPartners.find(bp => bp.id === sc.subcontractor_id);
        return (
          <div>
            <span className="font-mono text-xs text-slate-500">{sc.subcontract_number}</span>
            <p className="text-sm font-medium">
              {sub ? getLocalizedName(sub, language, 'bp_name_ar', 'bp_name_en') : ''}
            </p>
          </div>
        );
      },
    },
    {
      header: t('date'),
      accessor: 'ipc_date',
      render: (value) => formatDate(value),
    },
    {
      header: language === 'ar' ? 'نسبة الإنجاز' : 'Completion',
      accessor: 'completion_percentage',
      render: (value) => (
        <Badge variant="outline" className="font-mono">
          {formatNumber(value, 1)}%
        </Badge>
      ),
    },
    {
      header: t('currentAmount'),
      accessor: 'current_gross_amount',
      render: (value) => <span className="font-mono">{formatCurrency(value, 'EGP')}</span>,
    },
    {
      header: t('netPayable'),
      accessor: 'net_payable_amount',
      render: (value) => <span className="font-mono font-semibold text-emerald-700">{formatCurrency(value, 'EGP')}</span>,
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
        title={t('subcontractorIPC')}
        subtitle={language === 'ar' ? 'مستخلصات مقاولي الباطن - نظام تراكمي' : 'Subcontractor IPCs - Cumulative System'}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'مستخلص مقاول' : 'SC IPC'}`}
      />

      <DataTable
        columns={columns}
        data={ipcs}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `${t('edit')} ${t('subcontractorIPC')}` : `${t('add')} ${t('subcontractorIPC')}`}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="full"
      >
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Header Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>{language === 'ar' ? 'عقد الباطن' : 'Subcontract'} *</Label>
                    <Select
                      value={formData.subcontract_id}
                      onValueChange={handleSubcontractChange}
                      disabled={!!editingItem}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر العقد' : 'Select Subcontract'} />
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
                    <Label>{t('ipcNumber')} *</Label>
                    <Input
                      value={formData.ipc_number}
                      onChange={(e) => setFormData({ ...formData, ipc_number: e.target.value })}
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
                        <SelectItem value="submitted">{t('submitted')}</SelectItem>
                        <SelectItem value="under_review">{language === 'ar' ? 'قيد المراجعة' : 'Under Review'}</SelectItem>
                        <SelectItem value="approved">{t('approved')}</SelectItem>
                        <SelectItem value="certified">{language === 'ar' ? 'معتمد' : 'Certified'}</SelectItem>
                        <SelectItem value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('date')} *</Label>
                    <Input
                      type="date"
                      value={formData.ipc_date}
                      onChange={(e) => setFormData({ ...formData, ipc_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('periodFrom')} *</Label>
                    <Input
                      type="date"
                      value={formData.period_from}
                      onChange={(e) => setFormData({ ...formData, period_from: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('periodTo')} *</Label>
                    <Input
                      type="date"
                      value={formData.period_to}
                      onChange={(e) => setFormData({ ...formData, period_to: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'قيمة العقد' : 'Contract Value'}</Label>
                    <Input
                      type="number"
                      value={formData.contract_value}
                      disabled
                      className="bg-slate-50 font-mono"
                    />
                  </div>
                </div>

                {/* Subcontract Info Card */}
                {selectedSubcontract && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 text-sm">
                      <Link2 className="h-4 w-4" />
                      <span className="font-medium">
                        {language === 'ar' ? 'مرتبط بالمشروع:' : 'Linked to Project:'}
                      </span>
                      <span>
                        {selectedProject ? `${selectedProject.project_code} - ${getLocalizedName(selectedProject, language, 'project_name_ar', 'project_name_en')}` : '-'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs */}
            {formData.subcontract_id && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="items" className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    {language === 'ar' ? 'بنود العمل' : 'Work Items'}
                  </TabsTrigger>
                  <TabsTrigger value="deductions" className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    {language === 'ar' ? 'الخصومات والإضافات' : 'Deductions & Additions'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="mt-4">
                  <IPCItemsGrid
                    items={ipcItems}
                    onItemChange={updateIpcItem}
                    isEditable={isEditable}
                  />
                </TabsContent>

                <TabsContent value="deductions" className="mt-4">
                  <div className="space-y-4">
                    <IPCDeductionsAdditions
                      deductions={deductions}
                      additions={additions}
                      onDeductionsChange={setDeductions}
                      onAdditionsChange={setAdditions}
                      currentGross={summary.currentGross}
                      isEditable={isEditable}
                    />
                    
                    <div className="space-y-2">
                      <Label>{t('notes')}</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {!formData.subcontract_id && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-6 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <p className="text-amber-700">
                    {language === 'ar' ? 'يرجى اختيار عقد الباطن أولاً' : 'Please select a subcontract first'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary Sidebar */}
          {formData.subcontract_id && (
            <div className="w-80 flex-shrink-0">
              <IPCSummaryCard
                summary={summary}
                deductions={summary.deductionsList}
                additions={summary.additionsList}
                vatPercentage={formData.vat_percentage}
              />
              
              {/* Completion Badge */}
              <Card className="mt-4 bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-blue-600 mb-1">
                    {language === 'ar' ? 'نسبة الإنجاز الكلية' : 'Overall Completion'}
                  </p>
                  <p className="text-3xl font-bold text-blue-700">
                    {formatNumber(summary.completionPercentage, 1)}%
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
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