import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext.jsx';
import { useCompany } from '@/components/shared/CompanyContext.jsx';
import { formatNumber, formatCurrency, formatDate, getStatusColor } from '@/components/shared/formatters';
import { cn } from "@/lib/utils";
import PageHeader from '@/components/shared/PageHeader';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import BOQExcelImport from '@/components/boq/BOQExcelImport';
import { exportBOQToExcel } from '@/components/boq/BOQExcelExport';

const CostBreakdownModal = lazy(() => import('@/components/boq/CostBreakdownModal'));
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Download,
  Upload,
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
  Wallet,
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Users,
  Send,
} from 'lucide-react';
import { toast } from "sonner";

export default function TenderDetails() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const urlParams = new URLSearchParams(window.location.search);
  const tenderId = urlParams.get('id');

  const [activeTab, setActiveTab] = useState('overview');
  const [showBOQModal, setShowBOQModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [costBreakdownItem, setCostBreakdownItem] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [formData, setFormData] = useState({
    item_description: '',
    external_code: '',
    quantity: '',
    uom: '',
    unit_price: '',
    notes: '',
  });

  const { data: tender } = useQuery({
    queryKey: ['tender', tenderId],
    queryFn: async () => {
      const tenders = await base44.entities.Tender.filter({ id: tenderId });
      return tenders[0];
    },
    enabled: !!tenderId,
  });

  const { data: boqItems = [], isLoading: boqLoading } = useQuery({
    queryKey: ['tenderBOQ', tenderId],
    queryFn: () => base44.entities.TenderBOQ.filter({ tender_id: tenderId }, 'sort_order', 2000),
    enabled: !!tenderId,
  });

  const { data: bps = [] } = useQuery({
    queryKey: ['bps', currentCompany?.id],
    queryFn: () => base44.entities.BusinessPartner.list(),
  });

  const client = bps.find(bp => bp.id === tender?.client_id);
  const consultant = bps.find(bp => bp.id === tender?.consultant_id);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TenderBOQ.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenderBOQ'] });
      setShowBOQModal(false);
      toast.success(language === 'ar' ? 'تم إضافة البند' : 'Item added');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TenderBOQ.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenderBOQ'] });
      setShowBOQModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const descendants = getDescendantIds(id);
      for (const descId of [...descendants, id].reverse()) {
        await base44.entities.TenderBOQ.delete(descId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenderBOQ'] });
      setShowDelete(false);
      toast.success(language === 'ar' ? 'تم حذف البند' : 'Item deleted');
    },
  });

  const convertToProjectMutation = useMutation({
    mutationFn: async () => {
      // Create project from tender
      const project = await base44.entities.Project.create({
        company_id: currentCompany?.id,
        project_code: `PRJ-${tender.tender_number}`,
        project_name_ar: tender.tender_name,
        project_name_en: tender.tender_name,
        project_type: 'external',
        client_id: tender.client_id,
        consultant_id: tender.consultant_id,
        original_contract_value: tender.estimated_value,
        status: 'active',
      });

      // Copy BOQ items to project
      const itemMap = {};
      for (const item of boqItems.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))) {
        const newItem = await base44.entities.ProjectBOQ.create({
          project_id: project.id,
          parent_boq_id: item.parent_boq_id ? itemMap[item.parent_boq_id] : null,
          level: item.level,
          system_code: item.system_code,
          external_code: item.external_code,
          item_description: item.item_description,
          quantity: item.quantity,
          uom: item.uom,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          sort_order: item.sort_order,
        });
        itemMap[item.id] = newItem.id;
      }

      // Update tender status
      await base44.entities.Tender.update(tenderId, { status: 'won' });

      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['tender'] });
      toast.success(language === 'ar' ? 'تم تحويل المناقصة إلى مشروع' : 'Tender converted to project');
      window.location.href = createPageUrl('ProjectDetails') + `?id=${project.id}`;
    },
  });

  const getDescendantIds = (parentId) => {
    const descendants = [];
    const children = boqItems.filter(item => item.parent_boq_id === parentId);
    children.forEach(child => {
      descendants.push(child.id);
      descendants.push(...getDescendantIds(child.id));
    });
    return descendants;
  };

  const hierarchicalData = useMemo(() => {
    if (!boqItems.length) return [];
    
    const itemMap = {};
    boqItems.forEach(item => {
      itemMap[item.id] = { ...item, children: [] };
    });
    
    const roots = [];
    boqItems.forEach(item => {
      if (item.parent_boq_id && itemMap[item.parent_boq_id]) {
        itemMap[item.parent_boq_id].children.push(itemMap[item.id]);
      } else if (!item.parent_boq_id) {
        roots.push(itemMap[item.id]);
      }
    });
    
    const sortItems = (items) => {
      items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      items.forEach(item => sortItems(item.children));
    };
    sortItems(roots);
    
    return roots;
  }, [boqItems]);

  const calculateSubtotal = (item) => {
    if (item.level === 3) {
      return (item.quantity || 0) * (item.unit_price || 0);
    }
    return item.children.reduce((sum, child) => sum + calculateSubtotal(child), 0);
  };

  const grandTotal = hierarchicalData.reduce((sum, item) => sum + calculateSubtotal(item), 0);

  const toggleExpand = (itemId) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleAddItem = (level, parent = null) => {
    setEditingItem(null);
    const siblings = boqItems.filter(i => i.parent_boq_id === parent?.id).length;
    const code = parent 
      ? `${parent.external_code || parent.system_code}.${siblings + 1}`
      : String(boqItems.filter(i => i.level === 1).length + 1);
    
    setFormData({
      item_description: '',
      external_code: code,
      quantity: '',
      uom: '',
      unit_price: '',
      notes: '',
      level,
      parent_boq_id: parent?.id || null,
    });
    setShowBOQModal(true);
  };

  const handleSaveBOQ = () => {
    const total = formData.level === 3 ? (parseFloat(formData.quantity) || 0) * (parseFloat(formData.unit_price) || 0) : null;
    
    const data = {
      tender_id: tenderId,
      parent_boq_id: formData.parent_boq_id,
      level: formData.level,
      system_code: formData.external_code || `BOQ-${Date.now()}`,
      external_code: formData.external_code,
      item_description: formData.item_description,
      quantity: formData.level === 3 ? parseFloat(formData.quantity) || null : null,
      uom: formData.level === 3 ? formData.uom : null,
      unit_price: formData.level === 3 ? parseFloat(formData.unit_price) || null : null,
      total_amount: total,
      notes: formData.notes,
      sort_order: editingItem?.sort_order || (boqItems.filter(i => i.parent_boq_id === formData.parent_boq_id).length + 1)
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleExport = () => {
    const result = exportBOQToExcel(boqItems, tender?.tender_number, language);
    if (result.success) {
      toast.success(language === 'ar' ? 'تم التصدير' : 'Exported');
    }
  };

  const handleOpenCostBreakdown = (item) => {
    setCostBreakdownItem({ ...item, id: item.id });
    setShowCostBreakdown(true);
  };

  const renderBOQItem = (item, depth = 0) => {
    const isExpanded = expandedItems[item.id] !== false;
    const hasChildren = item.children && item.children.length > 0;
    const subtotal = calculateSubtotal(item);

    return (
      <React.Fragment key={item.id}>
        <tr className={cn(
          "border-b hover:bg-slate-50",
          item.level === 1 && "bg-slate-100 font-semibold",
          item.level === 2 && "bg-slate-50",
        )}>
          <td className="p-2 w-32">
            <div className="flex items-center gap-1">
              {hasChildren && (
                <button onClick={() => toggleExpand(item.id)} className="p-0.5 hover:bg-slate-200 rounded">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
              <span className={cn(
                item.level === 1 && 'text-red-600',
                item.level === 2 && 'text-amber-600',
                item.level === 3 && 'text-green-600'
              )}>
                {item.external_code || item.system_code}
              </span>
            </div>
          </td>
          <td className="p-2" style={{ paddingRight: isRTL ? 0 : depth * 20, paddingLeft: isRTL ? depth * 20 : 0 }}>
            <div className="flex items-center gap-2">
              <span>{item.level === 1 ? '🔴' : item.level === 2 ? '🟡' : '🟢'}</span>
              <span>{item.item_description}</span>
              {item.has_cost_breakdown && <Badge variant="outline" className="text-xs">💰</Badge>}
            </div>
          </td>
          <td className="p-2 text-center">{item.level === 3 ? item.uom : '-'}</td>
          <td className="p-2 text-center font-mono">{item.level === 3 ? formatNumber(item.quantity, 2) : '-'}</td>
          <td className="p-2 text-center font-mono">{item.level === 3 ? formatNumber(item.unit_price, 2) : '-'}</td>
          <td className="p-2 text-center font-mono font-medium">
            {item.level === 3 ? formatNumber(subtotal, 2) : <span className="text-slate-500">Σ {formatNumber(subtotal, 2)}</span>}
          </td>
          <td className="p-2">
            <div className="flex items-center gap-1">
              {item.level === 3 && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenCostBreakdown(item)}>
                  <Wallet className="h-4 w-4 text-blue-600" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                setEditingItem(item);
                setFormData({ ...item });
                setShowBOQModal(true);
              }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                setEditingItem(item);
                setShowDelete(true);
              }}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
              {item.level < 3 && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddItem(item.level + 1, item)}>
                  <Plus className="h-4 w-4 text-green-600" />
                </Button>
              )}
            </div>
          </td>
        </tr>
        {isExpanded && hasChildren && item.children.map(child => renderBOQItem(child, depth + 1))}
      </React.Fragment>
    );
  };

  if (!tender) {
    return <div className="p-8 text-center">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>;
  }

  const statusLabels = {
    draft: { ar: 'مسودة', en: 'Draft' },
    under_study: { ar: 'قيد الدراسة', en: 'Under Study' },
    submitted: { ar: 'مقدم', en: 'Submitted' },
    won: { ar: 'فائز', en: 'Won' },
    lost: { ar: 'خاسر', en: 'Lost' },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={tender.tender_name}
        subtitle={tender.tender_number}
      >
        <Link to={createPageUrl('Tenders')}>
          <Button variant="outline" size="sm">
            {isRTL ? <ArrowRight className="h-4 w-4 ml-1" /> : <ArrowLeft className="h-4 w-4 mr-1" />}
            {language === 'ar' ? 'العودة' : 'Back'}
          </Button>
        </Link>
        {tender.status !== 'won' && (
          <Button 
            onClick={() => convertToProjectMutation.mutate()} 
            disabled={convertToProjectMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'تحويل إلى مشروع' : 'Convert to Project'}
          </Button>
        )}
      </PageHeader>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{language === 'ar' ? 'العميل' : 'Client'}</p>
                <p className="font-medium">{client ? (language === 'ar' ? client.bp_name_ar : client.bp_name_en) : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{language === 'ar' ? 'تاريخ التقديم' : 'Submission'}</p>
                <p className="font-medium">{formatDate(tender.submission_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{language === 'ar' ? 'القيمة التقديرية' : 'Estimated'}</p>
                <p className="font-medium">{formatCurrency(tender.estimated_value)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Badge className={cn("text-sm px-3 py-1", getStatusColor(tender.status))}>
                {statusLabels[tender.status]?.[language] || tender.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{language === 'ar' ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
          <TabsTrigger value="boq">{language === 'ar' ? 'جدول الكميات' : 'BOQ'}</TabsTrigger>
          <TabsTrigger value="documents">{language === 'ar' ? 'المستندات' : 'Documents'}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'تفاصيل المناقصة' : 'Tender Details'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">{language === 'ar' ? 'الاستشاري' : 'Consultant'}</p>
                  <p className="font-medium">{consultant ? (language === 'ar' ? consultant.bp_name_ar : consultant.bp_name_en) : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">{language === 'ar' ? 'تاريخ الفتح' : 'Opening Date'}</p>
                  <p className="font-medium">{formatDate(tender.opening_date)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-500">{language === 'ar' ? 'ملاحظات' : 'Notes'}</p>
                  <p>{tender.notes || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="boq" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{language === 'ar' ? 'جدول الكميات' : 'Bill of Quantities'}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
                    <Upload className="h-4 w-4 mr-1" />
                    {language === 'ar' ? 'استيراد' : 'Import'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExport} disabled={!boqItems.length}>
                    <Download className="h-4 w-4 mr-1" />
                    {language === 'ar' ? 'تصدير' : 'Export'}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-1" />
                        {language === 'ar' ? 'إضافة' : 'Add'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleAddItem(1)}>🔴 Level 1</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddItem(2)}>🟡 Level 2</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddItem(3)}>🟢 Level 3</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-y">
                    <tr>
                      <th className="p-2 text-right w-32">{language === 'ar' ? 'الكود' : 'Code'}</th>
                      <th className="p-2 text-right">{language === 'ar' ? 'الوصف' : 'Description'}</th>
                      <th className="p-2 text-center w-20">{language === 'ar' ? 'الوحدة' : 'UOM'}</th>
                      <th className="p-2 text-center w-24">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                      <th className="p-2 text-center w-28">{language === 'ar' ? 'السعر' : 'Price'}</th>
                      <th className="p-2 text-center w-32">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                      <th className="p-2 w-32"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {hierarchicalData.map(item => renderBOQItem(item))}
                    {hierarchicalData.length > 0 && (
                      <tr className="bg-blue-100 font-bold">
                        <td colSpan="5" className="p-3 text-right">
                          📊 {language === 'ar' ? 'الإجمالي' : 'GRAND TOTAL'}
                        </td>
                        <td className="p-3 text-center">{formatCurrency(grandTotal)}</td>
                        <td></td>
                      </tr>
                    )}
                    {hierarchicalData.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-500">
                          {language === 'ar' ? 'لا توجد بنود' : 'No items'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">{language === 'ar' ? 'المستندات قريباً' : 'Documents coming soon'}</p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* BOQ Form Modal */}
      <FormModal
        open={showBOQModal}
        onClose={() => setShowBOQModal(false)}
        title={editingItem ? (language === 'ar' ? 'تعديل بند' : 'Edit Item') : (language === 'ar' ? 'إضافة بند' : 'Add Item')}
        onSave={handleSaveBOQ}
        isSaving={createMutation.isPending || updateMutation.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الكود' : 'Code'}</Label>
            <Input
              value={formData.external_code}
              onChange={(e) => setFormData({ ...formData, external_code: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
            <Textarea
              value={formData.item_description}
              onChange={(e) => setFormData({ ...formData, item_description: e.target.value })}
              rows={3}
            />
          </div>
          {formData.level === 3 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الكمية' : 'Quantity'}</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الوحدة' : 'UOM'}</Label>
                <Input
                  value={formData.uom}
                  onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'السعر' : 'Price'}</Label>
                <Input
                  type="number"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      </FormModal>

      <DeleteConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteMutation.mutate(editingItem?.id)}
        isDeleting={deleteMutation.isPending}
      />

      <BOQExcelImport
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        projectId={tenderId}
        entityType="TenderBOQ"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tenderBOQ'] })}
      />

      {showCostBreakdown && costBreakdownItem && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>}>
          <CostBreakdownModal
            open={showCostBreakdown}
            onClose={() => setShowCostBreakdown(false)}
            boqItem={costBreakdownItem}
          />
        </Suspense>
      )}
    </div>
  );
}