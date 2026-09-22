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
import { formatCurrency, formatNumber, formatDate, getLocalizedName } from '@/components/shared/formatters';
import IPCItemsGrid from '@/components/ipc/IPCItemsGrid';
import IPCDeductionsAdditions from '@/components/ipc/IPCDeductionsAdditions';
import IPCSummaryCard from '@/components/ipc/IPCSummaryCard';
import { calculateIPCItem, calculateIPCSummary, getDeductionLabel, getAdditionLabel } from '@/lib/ipcEngine';
import { postClientIPCApproval } from '@/lib/glPostingEngine';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Calculator, FileCheck, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const initialFormData = {
  project_id: '',
  ipc_number: '',
  ipc_date: '',
  period_from: '',
  period_to: '',
  ipc_sequence: 1,
  retention_percentage: 10,
  retention_cap: 0,
  insurance_percentage: 1,
  vat_percentage: 14,
  wht_percentage: 1,
  advance_payment_balance: 0,
  advance_recovery_percentage: 0,
  previous_retention_total: 0,
  status: 'draft',
};

export default function ClientIPC() {
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

  const { data: ipcs = [], isLoading } = useQuery({
    queryKey: ['clientIpcs', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.ClientIPC.filter({ company_id: currentCompany.id })
      : base44.entities.ClientIPC.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.Project.filter({ company_id: currentCompany.id })
      : base44.entities.Project.list(),
  });

  const { data: boqItems = [] } = useQuery({
    queryKey: ['boq', formData.project_id],
    queryFn: () => formData.project_id 
      ? base44.entities.ProjectBOQ.filter({ project_id: formData.project_id })
      : [],
    enabled: !!formData.project_id,
  });

  const { data: glAccounts = [] } = useQuery({
    queryKey: ['glAccounts', currentCompany?.id],
    queryFn: () => currentCompany
      ? base44.entities.GLAccount.filter({ company_id: currentCompany.id })
      : base44.entities.GLAccount.list(),
  });

  // Fetch previous IPC items for the selected project
  const { data: previousIPCData } = useQuery({
    queryKey: ['previousIPCData', formData.project_id, editingItem?.id],
    queryFn: async () => {
      if (!formData.project_id) return { ipc: null, items: [] };
      
      // Get all IPCs for this project
      const allIPCs = await base44.entities.ClientIPC.filter({ project_id: formData.project_id });
      const sortedIPCs = allIPCs
        .filter(ipc => ipc.id !== editingItem?.id && ipc.status !== 'draft')
        .sort((a, b) => b.ipc_sequence - a.ipc_sequence);
      
      const prevIPC = sortedIPCs[0];
      if (!prevIPC) return { ipc: null, items: [] };
      
      // Get previous IPC items
      const prevItems = await base44.entities.ClientIPCItem.filter({ ipc_id: prevIPC.id });
      return { ipc: prevIPC, items: prevItems };
    },
    enabled: !!formData.project_id,
  });

  // Initialize IPC items when project changes
  useEffect(() => {
    if (boqItems.length > 0 && !editingItem && formData.project_id) {
      const level3Items = boqItems.filter(item => item.level === 3);
      const prevItems = previousIPCData?.items || [];
      
      const items = level3Items.map(boq => {
        const prevItem = prevItems.find(p => p.boq_id === boq.id);
        // Pre-populate Current Qty from approved site IR quantities
        const irApprovedQty = parseFloat(boq.last_approved_quantity) || 0;
        const baseItem = {
          boq_id: boq.id,
          item_code: boq.external_code || boq.system_code,
          item_description: boq.item_description,
          uom: boq.uom,
          boq_quantity: boq.quantity,
          unit_price: boq.unit_price,
          contract_amount: boq.total_amount,
          previous_quantity: prevItem?.cumulative_quantity || 0,
          previous_amount: prevItem?.cumulative_amount || 0,
          current_quantity: irApprovedQty,
          completion_percentage: parseFloat(boq.last_approved_completion) || 100,
          cumulative_quantity: 0,
          cumulative_amount: 0,
          current_amount: 0,
          sort_order: boq.sort_order || 0,
        };
        // Calculate cumulative/current amounts using the engine
        return calculateIPCItem(baseItem, irApprovedQty, baseItem.completion_percentage);
      }).sort((a, b) => a.sort_order - b.sort_order);
      
      setIpcItems(items);
      
      // Initialize default deductions
      setDeductions([
        { category: 'retention', is_percentage: true, percentage: formData.retention_percentage, amount: 0 },
        { category: 'insurance', is_percentage: true, percentage: formData.insurance_percentage, amount: 0 },
        { category: 'advance_recovery', is_percentage: false, percentage: 0, amount: 0 },
      ]);
      setAdditions([]);
    }
  }, [boqItems, previousIPCData, editingItem, formData.project_id]);

  // Calculate item values with the Egyptian cumulative formula
  const calculateItem = (item, currentQty, completionPct) => {
    return calculateIPCItem(item, currentQty, completionPct);
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

  // Calculate summary with Egyptian statutory deductions using shared engine
  const summary = useMemo(() => {
    return calculateIPCSummary(ipcItems, {
      vatPercentage: parseFloat(formData.vat_percentage) || 14,
      whtPercentage: parseFloat(formData.wht_percentage) || 1,
      retentionPercentage: parseFloat(formData.retention_percentage) || 10,
      retentionCap: parseFloat(formData.retention_cap) || 0,
      advancePaymentBalance: parseFloat(formData.advance_payment_balance) || 0,
      advanceRecoveryPercentage: parseFloat(formData.advance_recovery_percentage) || 0,
      previousRetentionTotal: parseFloat(formData.previous_retention_total) || 0,
      deductions,
      additions,
    });
  }, [ipcItems, deductions, additions, formData.vat_percentage, formData.wht_percentage,
      formData.retention_percentage, formData.retention_cap, formData.advance_payment_balance,
      formData.advance_recovery_percentage, formData.previous_retention_total]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const ipc = await base44.entities.ClientIPC.create({
        ...data,
        cumulative_gross_amount: summary.cumulativeGross,
        previous_certified_amount: summary.previousCertified,
        current_gross_amount: summary.currentGross,
        advance_recovery_amount: summary.advanceRecovery || 0,
        retention_amount: summary.retentionAmount || 0,
        wht_amount: summary.whtAmount || 0,
        total_deductions: summary.totalDeductions,
        total_additions: summary.totalAdditions,
        taxable_net: summary.taxableNet,
        vat_amount: summary.vatAmount,
        net_payable_amount: summary.netPayable,
      });
      
      // Create IPC items
      for (const item of ipcItems) {
        await base44.entities.ClientIPCItem.create({
          ipc_id: ipc.id,
          ...item,
        });
      }
      
      // Create deductions/additions
      for (const d of deductions) {
        if (d.amount > 0) {
          await base44.entities.IPCDeductionAddition.create({
            ipc_id: ipc.id,
            ipc_type: 'client',
            type: 'deduction',
            ...d,
          });
        }
      }
      for (const a of additions) {
        if (a.amount > 0) {
          await base44.entities.IPCDeductionAddition.create({
            ipc_id: ipc.id,
            ipc_type: 'client',
            type: 'addition',
            ...a,
          });
        }
      }

      // Post double-entry GL entries on approval
      if (data.status === 'approved' || data.status === 'certified') {
        try {
          await postClientIPCApproval({
            ipc: { ...ipc, ...data, current_gross_amount: summary.currentGross, retention_amount: summary.retentionAmount, vat_amount: summary.vatAmount },
            accounts: glAccounts,
            companyId: currentCompany?.id,
            costCenterId: data.project_id,
          });
        } catch (e) {
          console.error('[GL Posting] Failed:', e);
        }
      }

      return ipc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientIpcs'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.ClientIPC.update(id, {
        ...data,
        cumulative_gross_amount: summary.cumulativeGross,
        previous_certified_amount: summary.previousCertified,
        current_gross_amount: summary.currentGross,
        retention_amount: deductions.find(d => d.category === 'retention')?.amount || 0,
        total_deductions: summary.totalDeductions,
        total_additions: summary.totalAdditions,
        vat_amount: summary.vatAmount,
        net_payable_amount: summary.netPayable,
      });
      
      // Update items - delete old and create new
      const existingItems = await base44.entities.ClientIPCItem.filter({ ipc_id: id });
      for (const item of existingItems) {
        await base44.entities.ClientIPCItem.delete(item.id);
      }
      for (const item of ipcItems) {
        await base44.entities.ClientIPCItem.create({ ipc_id: id, ...item });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientIpcs'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Delete items first
      const items = await base44.entities.ClientIPCItem.filter({ ipc_id: id });
      for (const item of items) {
        await base44.entities.ClientIPCItem.delete(item.id);
      }
      await base44.entities.ClientIPC.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientIpcs'] });
      setDeleteOpen(false);
      toast.success(t('deletedSuccessfully'));
    },
  });

  const handleAdd = () => {
    setEditingItem(null);
    const projectIPCs = ipcs.filter(i => i.project_id === formData.project_id);
    const nextSequence = (Math.max(...projectIPCs.map(i => i.ipc_sequence || 0), 0)) + 1;
    setFormData({ 
      ...initialFormData, 
      company_id: currentCompany?.id,
      ipc_sequence: nextSequence,
      ipc_number: `IPC-${String(nextSequence).padStart(3, '0')}`,
      ipc_date: new Date().toISOString().split('T')[0],
    });
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
    
    // Load IPC items
    const items = await base44.entities.ClientIPCItem.filter({ ipc_id: item.id });
    setIpcItems(items);
    
    // Load deductions/additions
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

  const handleProjectChange = (projectId) => {
    const projectIPCs = ipcs.filter(i => i.project_id === projectId);
    const nextSequence = (Math.max(...projectIPCs.map(i => i.ipc_sequence || 0), 0)) + 1;
    setFormData({ 
      ...formData, 
      project_id: projectId,
      ipc_sequence: nextSequence,
      ipc_number: `IPC-${String(nextSequence).padStart(3, '0')}`,
    });
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
      header: t('project'),
      accessor: 'project_id',
      render: (value) => {
        const project = projects.find(p => p.id === value);
        return project ? (
          <div>
            <span className="font-mono text-xs text-slate-500">{project.project_code}</span>
            <p className="text-sm">{getLocalizedName(project, language, 'project_name_ar', 'project_name_en')}</p>
          </div>
        ) : '-';
      },
    },
    {
      header: t('date'),
      accessor: 'ipc_date',
      render: (value) => formatDate(value),
    },
    {
      header: language === 'ar' ? 'الفترة' : 'Period',
      accessor: 'period_from',
      render: (value, row) => `${formatDate(value)} - ${formatDate(row.period_to)}`,
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
        title={t('ipc')}
        subtitle={language === 'ar' ? 'مستخلصات العملاء - نظام تراكمي' : 'Client Interim Payment Certificates - Cumulative System'}
        onAdd={handleAdd}
        addLabel={`${t('add')} ${language === 'ar' ? 'مستخلص' : 'IPC'}`}
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
        title={editingItem ? `${t('edit')} ${t('ipc')}` : `${t('add')} ${t('ipc')}`}
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
                  <div className="space-y-2">
                    <Label>{t('project')} *</Label>
                    <Select
                      value={formData.project_id}
                      onValueChange={handleProjectChange}
                      disabled={!!editingItem}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select Project'} />
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
                    <Label>{t('ipcNumber')} *</Label>
                    <Input
                      value={formData.ipc_number}
                      onChange={(e) => setFormData({ ...formData, ipc_number: e.target.value })}
                    />
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
                        <SelectItem value="approved">{t('approved')}</SelectItem>
                        <SelectItem value="certified">{language === 'ar' ? 'معتمد' : 'Certified'}</SelectItem>
                        <SelectItem value="invoiced">{language === 'ar' ? 'مفوتر' : 'Invoiced'}</SelectItem>
                        <SelectItem value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Label>{t('vat')} %</Label>
                    <Input
                      type="number"
                      value={formData.vat_percentage}
                      onChange={(e) => setFormData({ ...formData, vat_percentage: parseFloat(e.target.value) || 14 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'ضريبة الخصم (WHT) %' : 'WHT %'}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.wht_percentage}
                      onChange={(e) => setFormData({ ...formData, wht_percentage: parseFloat(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'سقف الضمان' : 'Retention Cap'}</Label>
                    <Input
                      type="number"
                      value={formData.retention_cap}
                      onChange={(e) => setFormData({ ...formData, retention_cap: parseFloat(e.target.value) || 0 })}
                      placeholder="0 = no cap"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'رقم التسلسل' : 'Sequence'}</Label>
                    <Input
                      type="number"
                      value={formData.ipc_sequence}
                      disabled
                      className="bg-slate-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'رصيد الدفعة المقدمة' : 'Advance Balance'}</Label>
                    <Input
                      type="number"
                      value={formData.advance_payment_balance}
                      onChange={(e) => setFormData({ ...formData, advance_payment_balance: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? '% استرداد الدفعة' : 'Advance Recovery %'}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.advance_recovery_percentage}
                      onChange={(e) => setFormData({ ...formData, advance_recovery_percentage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            {formData.project_id && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="items" className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    {language === 'ar' ? 'بنود جدول الكميات' : 'BOQ Items'}
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
                  <IPCDeductionsAdditions
                    deductions={deductions}
                    additions={additions}
                    onDeductionsChange={setDeductions}
                    onAdditionsChange={setAdditions}
                    currentGross={summary.currentGross}
                    isEditable={isEditable}
                  />
                </TabsContent>
              </Tabs>
            )}

            {!formData.project_id && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-6 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <p className="text-amber-700">
                    {language === 'ar' ? 'يرجى اختيار المشروع أولاً' : 'Please select a project first'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary Sidebar */}
          {formData.project_id && (
            <div className="w-80 flex-shrink-0">
              <IPCSummaryCard
                summary={summary}
                deductions={summary.deductionsList}
                additions={summary.additionsList}
                vatPercentage={formData.vat_percentage}
              />
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