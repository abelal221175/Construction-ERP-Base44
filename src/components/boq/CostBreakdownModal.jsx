import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import { formatNumber, formatCurrency, getLocalizedName, formatDateTime } from '@/components/shared/formatters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  Package, 
  HardHat, 
  Users, 
  Truck,
  Wrench,
  BarChart3,
  Save,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  History,
  RefreshCw,
  Loader2,
  AlertTriangle,
  FileUp,
  FileDown,
  BookmarkPlus,
  ArrowUpDown,
  Calculator,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import CostBreakdownHistoryTab from './CostBreakdownHistoryTab';
import CreateRFQFromCostBreakdownModal from './CreateRFQFromCostBreakdownModal';

const costElements = [
  { type: 'material', icon: Package, label_ar: 'المواد', label_en: 'Materials', color: 'text-blue-600 bg-blue-50' },
  { type: 'subcontractor', icon: HardHat, label_ar: 'مقاول باطن', label_en: 'Subcontractor', color: 'text-amber-600 bg-amber-50' },
  { type: 'labor', icon: Users, label_ar: 'العمالة', label_en: 'Labour', color: 'text-purple-600 bg-purple-50' },
  { type: 'equipment', icon: Truck, label_ar: 'المعدات', label_en: 'Equipment', color: 'text-emerald-600 bg-emerald-50' },
  { type: 'service', icon: Wrench, label_ar: 'الخدمات', label_en: 'Service', color: 'text-pink-600 bg-pink-50' },
  { type: 'indirect', icon: BarChart3, label_ar: 'تكاليف غير مباشرة', label_en: 'Indirect & Markup', color: 'text-slate-600 bg-slate-100' },
];

const statusConfig = {
  draft: { icon: Clock, color: 'bg-slate-100 text-slate-700', label_ar: 'مسودة', label_en: 'Draft' },
  submitted: { icon: Send, color: 'bg-amber-100 text-amber-700', label_ar: 'مقدم', label_en: 'Submitted' },
  approved: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700', label_ar: 'معتمد', label_en: 'Approved' },
  rejected: { icon: XCircle, color: 'bg-red-100 text-red-700', label_ar: 'مرفوض', label_en: 'Rejected' },
};

export default function CostBreakdownModal({ open, onClose, boqItem }) {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('breakdown');
  const [details, setDetails] = useState([]);
  const [expandedSections, setExpandedSections] = useState(['material', 'subcontractor', 'labor', 'equipment', 'service', 'indirect']);
  const [markup, setMarkup] = useState(40);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showRFQModal, setShowRFQModal] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  // Enhanced pricing matrix state
  const [gaOverhead, setGaOverhead] = useState(0);           // G&A Overhead
  const [gaOverheadType, setGaOverheadType] = useState('percentage'); // 'percentage' | 'lumpsum'
  const [mwReserve, setMwReserve] = useState(0);             // Maintenance & Warranty Reserve
  const [mwReserveType, setMwReserveType] = useState('percentage');
  const [targetProfit, setTargetProfit] = useState(0);      // Target Profit Margin
  const [targetProfitType, setTargetProfitType] = useState('percentage');
  const [directExpenses, setDirectExpenses] = useState(0);   // Direct Expenses & Site Overhead (lump sum)

  // Queries
  const { data: allEstimations = [] } = useQuery({
    queryKey: ['costEstimations', boqItem?.id],
    queryFn: () => boqItem?.id ? base44.entities.CostEstimation.filter({ boq_id: boqItem.id }, '-version') : [],
    enabled: !!boqItem?.id,
  });

  const currentEstimation = allEstimations.find(e => e.is_current) || allEstimations[0];

  const { data: estimationDetails = [] } = useQuery({
    queryKey: ['costEstimationDetails', currentEstimation?.id],
    queryFn: () => currentEstimation ? base44.entities.CostEstimationDetail.filter({ estimation_id: currentEstimation.id }, 'line_no') : [],
    enabled: !!currentEstimation,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['boqTemplates', currentCompany?.id],
    queryFn: () => base44.entities.BOQTemplate.filter({ company_id: currentCompany?.id, is_active: true }),
    enabled: !!currentCompany?.id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', currentCompany?.id],
    queryFn: () => base44.entities.Product.filter({ company_id: currentCompany?.id, is_active: true }),
    enabled: !!currentCompany?.id,
  });

  const { data: businessPartners = [] } = useQuery({
    queryKey: ['businessPartners', currentCompany?.id],
    queryFn: () => base44.entities.BusinessPartner.filter({ company_id: currentCompany?.id, is_active: true }),
    enabled: !!currentCompany?.id,
  });

  const { data: equipmentList = [] } = useQuery({
    queryKey: ['equipment', currentCompany?.id],
    queryFn: () => base44.entities.Equipment.filter({ company_id: currentCompany?.id, is_active: true }),
    enabled: !!currentCompany?.id,
  });

  const { data: laborItems = [] } = useQuery({
    queryKey: ['laborItems', currentCompany?.id],
    queryFn: () => base44.entities.LaborItem.filter({ company_id: currentCompany?.id, is_active: true }),
    enabled: !!currentCompany?.id,
  });

  const { data: serviceItems = [] } = useQuery({
    queryKey: ['serviceItems', currentCompany?.id],
    queryFn: () => base44.entities.ServiceItem.filter({ company_id: currentCompany?.id, is_active: true }),
    enabled: !!currentCompany?.id,
  });

  const { data: indirectCostItems = [] } = useQuery({
    queryKey: ['indirectCostItems', currentCompany?.id],
    queryFn: () => base44.entities.IndirectCostItem.filter({ company_id: currentCompany?.id, is_active: true }),
    enabled: !!currentCompany?.id,
  });

  const subcontractors = businessPartners.filter(bp => bp.is_subcontractor);
  const suppliers = businessPartners.filter(bp => bp.is_supplier);

  // Initialize
  useEffect(() => {
    if (estimationDetails.length > 0) {
      setDetails(estimationDetails.map(d => ({ ...d, _key: d.id })));
    } else {
      setDetails([]);
    }
    if (currentEstimation) {
      setMarkup(currentEstimation.markup_percentage || 40);
      setSellingPrice(currentEstimation.unit_selling_price || boqItem?.unit_price || 0);
      setGaOverhead(currentEstimation.ga_overhead || 0);
      setGaOverheadType(currentEstimation.ga_overhead_type || 'percentage');
      setMwReserve(currentEstimation.mw_reserve || 0);
      setMwReserveType(currentEstimation.mw_reserve_type || 'percentage');
      setTargetProfit(currentEstimation.target_profit || currentEstimation.markup_percentage || 0);
      setTargetProfitType(currentEstimation.target_profit_type || 'percentage');
      setDirectExpenses(currentEstimation.direct_expenses || 0);
    } else {
      setSellingPrice(boqItem?.unit_price || 0);
    }
  }, [estimationDetails, currentEstimation, boqItem]);

  // Calculations
  const boqQuantity = boqItem?.quantity || 1;
  
  const dryCostPerUnit = useMemo(() => {
    return details.reduce((sum, d) => sum + (parseFloat(d.total_per_unit) || 0), 0);
  }, [details]);

  const totalDryCost = dryCostPerUnit * boqQuantity;

  // --- DoubleClick Pricing Calculation Matrix ---
  // Dry Cost = SUM(Material + Labor + Equipment + Subcontractor + Direct Expenses + Site Overhead)
  const dryCostWithExpenses = dryCostPerUnit + (parseFloat(directExpenses) || 0);

  // G&A Overhead amount (per unit)
  const gaOverheadAmount = gaOverheadType === 'percentage'
    ? dryCostWithExpenses * (parseFloat(gaOverhead) || 0) / 100
    : parseFloat(gaOverhead) || 0;

  // Maintenance & Warranty Reserve amount (per unit)
  const mwReserveAmount = mwReserveType === 'percentage'
    ? dryCostWithExpenses * (parseFloat(mwReserve) || 0) / 100
    : parseFloat(mwReserve) || 0;

  // Target Profit amount (per unit) - computed from dry cost + overheads
  const costBeforeProfit = dryCostWithExpenses + gaOverheadAmount + mwReserveAmount;
  const targetProfitAmount = targetProfitType === 'percentage'
    ? costBeforeProfit * (parseFloat(targetProfit) || 0) / 100
    : parseFloat(targetProfit) || 0;

  // Final Selling Price = Dry Cost + G&A + M&W Reserve + Profit
  const computedSellingPrice = costBeforeProfit + targetProfitAmount;
  const profitPerUnit = sellingPrice - dryCostWithExpenses - gaOverheadAmount - mwReserveAmount;
  const totalProfit = profitPerUnit * boqQuantity;
  const profitMargin = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;

  // Two-way pricing: update selling price when cost components change
  useEffect(() => {
    const newSelling = costBeforeProfit + targetProfitAmount;
    if (Math.abs(newSelling - sellingPrice) > 0.01) {
      setSellingPrice(Math.round(newSelling * 100) / 100);
    }
  }, [dryCostWithExpenses, gaOverhead, gaOverheadType, mwReserve, mwReserveType, targetProfit, targetProfitType, directExpenses]);

  // If selling price is manually modified, recalculate profit margin % automatically
  const handleSellingPriceChange = (val) => {
    const priceVal = parseFloat(val) || 0;
    setSellingPrice(priceVal);
    // Back-calculate profit margin % from the manually entered selling price
    if (costBeforeProfit > 0) {
      const impliedProfit = priceVal - costBeforeProfit;
      const impliedPct = (impliedProfit / costBeforeProfit) * 100;
      setTargetProfit(Math.round(impliedPct * 100) / 100);
      setTargetProfitType('percentage');
    }
  };

  const getCostsByType = (type) => details.filter(d => d.cost_element_type === type);
  const getTotalByType = (type) => getCostsByType(type).reduce((sum, d) => sum + (parseFloat(d.total_per_unit) || 0), 0);

  // Add detail
  const addDetail = (type) => {
    const newDetail = {
      _key: `new_${Date.now()}`,
      cost_element_type: type,
      line_no: details.length + 1,
      resource_code: '',
      resource_id: '',
      supplier_id: '',
      description_ar: language === 'ar' ? 'بند جديد' : '',
      description_en: language === 'en' ? 'New Item' : '',
      quantity_per_unit: 0,
      uom_ar: '',
      uom_en: '',
      unit_cost: 0,
      total_per_unit: 0,
    };
    setDetails([...details, newDetail]);
    if (!expandedSections.includes(type)) {
      setExpandedSections([...expandedSections, type]);
    }
  };

  const updateDetail = (key, field, value) => {
    setDetails(details.map(d => {
      if (d._key === key || d.id === key) {
        const updated = { ...d, [field]: value };
        if (field === 'quantity_per_unit' || field === 'unit_cost') {
          updated.total_per_unit = (parseFloat(updated.quantity_per_unit) || 0) * (parseFloat(updated.unit_cost) || 0);
        }
        return updated;
      }
      return d;
    }));
  };

  const removeDetail = (key) => {
    setDetails(details.filter(d => d._key !== key && d.id !== key));
  };

  // Master data selection handlers
  const handleSelectMasterData = (detailKey, resourceId, type) => {
    let data = null;
    if (type === 'material') {
      data = products.find(p => p.id === resourceId);
      if (data) {
        updateDetailFromMaster(detailKey, {
          resource_id: resourceId,
          resource_code: data.product_code,
          description_ar: data.product_name_ar,
          description_en: data.product_name_en,
          uom_ar: data.uom_ar,
          uom_en: data.uom_en,
          unit_cost: data.last_purchase_price || data.standard_cost || 0,
        });
      }
    } else if (type === 'subcontractor') {
      data = subcontractors.find(s => s.id === resourceId);
      if (data) {
        updateDetailFromMaster(detailKey, {
          resource_id: resourceId,
          resource_code: data.bp_code,
          description_ar: data.bp_name_ar,
          description_en: data.bp_name_en,
          supplier_id: resourceId,
        });
      }
    } else if (type === 'equipment') {
      data = equipmentList.find(e => e.id === resourceId);
      if (data) {
        updateDetailFromMaster(detailKey, {
          resource_id: resourceId,
          resource_code: data.equipment_code,
          description_ar: data.equipment_name_ar,
          description_en: data.equipment_name_en,
          unit_cost: data.daily_rental_rate || data.hourly_rental_rate || 0,
        });
      }
    } else if (type === 'labor') {
      data = laborItems.find(l => l.id === resourceId);
      if (data) {
        updateDetailFromMaster(detailKey, {
          resource_id: resourceId,
          resource_code: data.item_code,
          description_ar: data.item_name_ar,
          description_en: data.item_name_en,
          uom_ar: data.uom_ar,
          uom_en: data.uom_en,
          unit_cost: data.daily_rate || data.hourly_rate || 0,
        });
      }
    } else if (type === 'service') {
      data = serviceItems.find(s => s.id === resourceId);
      if (data) {
        updateDetailFromMaster(detailKey, {
          resource_id: resourceId,
          resource_code: data.item_code,
          description_ar: data.item_name_ar,
          description_en: data.item_name_en,
          uom_ar: data.uom_ar,
          uom_en: data.uom_en,
          unit_cost: data.standard_cost || 0,
        });
      }
    } else if (type === 'indirect') {
      data = indirectCostItems.find(i => i.id === resourceId);
      if (data) {
        updateDetailFromMaster(detailKey, {
          resource_id: resourceId,
          resource_code: data.item_code,
          description_ar: data.item_name_ar,
          description_en: data.item_name_en,
          uom_ar: data.uom_ar,
          uom_en: data.uom_en,
          unit_cost: data.standard_cost || 0,
        });
      }
    }
  };

  const updateDetailFromMaster = (key, updates) => {
    setDetails(details.map(d => {
      if (d._key === key || d.id === key) {
        const updated = { ...d, ...updates };
        updated.total_per_unit = (parseFloat(updated.quantity_per_unit) || 0) * (parseFloat(updated.unit_cost) || 0);
        return updated;
      }
      return d;
    }));
  };

  // Get master data options for each type
  const getMasterDataOptions = (type) => {
    switch (type) {
      case 'material': return products;
      case 'subcontractor': return subcontractors;
      case 'equipment': return equipmentList;
      case 'labor': return laborItems;
      case 'service': return serviceItems;
      case 'indirect': return indirectCostItems;
      default: return [];
    }
  };

  const getMasterDataLabel = (item, type) => {
    if (type === 'material') return { code: item.product_code, name: language === 'ar' ? item.product_name_ar : item.product_name_en };
    if (type === 'subcontractor') return { code: item.bp_code, name: language === 'ar' ? item.bp_name_ar : item.bp_name_en };
    if (type === 'equipment') return { code: item.equipment_code, name: language === 'ar' ? item.equipment_name_ar : item.equipment_name_en };
    return { code: item.item_code, name: language === 'ar' ? item.item_name_ar : item.item_name_en };
  };

  // Template functions
  const applyTemplate = async (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template?.template_details) {
      const templateDetails = typeof template.template_details === 'string' 
        ? JSON.parse(template.template_details) 
        : template.template_details;
      const newDetails = templateDetails.map((d, index) => ({
        ...d,
        _key: `template_${Date.now()}_${index}`,
        line_no: index + 1,
        total_per_unit: (d.quantity_per_unit || 0) * (d.unit_cost || 0),
      }));
      setDetails(newDetails);
      if (template.default_markup_percentage) {
        handleMarkupChange(template.default_markup_percentage);
      }
      toast.success(language === 'ar' ? 'تم تطبيق القالب' : 'Template applied');
    }
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال اسم القالب' : 'Please enter template name');
      return;
    }
    
    const templateCode = `TPL-${Date.now().toString(36).toUpperCase()}`;
    const templateDetails = details.map(d => ({
      cost_element_type: d.cost_element_type,
      resource_code: d.resource_code,
      description_ar: d.description_ar,
      description_en: d.description_en,
      quantity_per_unit: d.quantity_per_unit,
      uom_ar: d.uom_ar,
      uom_en: d.uom_en,
      unit_cost: d.unit_cost,
    }));

    await base44.entities.BOQTemplate.create({
      company_id: currentCompany?.id,
      template_code: templateCode,
      template_name_ar: templateName,
      template_name_en: templateName,
      template_details: JSON.stringify(templateDetails),
      default_markup_percentage: markup,
      standard_unit_cost: dryCostPerUnit,
      standard_unit_price: sellingPrice,
      is_active: true,
    });

    queryClient.invalidateQueries({ queryKey: ['boqTemplates'] });
    setShowSaveTemplateDialog(false);
    setTemplateName('');
    toast.success(language === 'ar' ? 'تم حفظ القالب' : 'Template saved');
  };

  // Import/Export Excel
  const exportToExcel = () => {
    const headers = ['Type', 'Code', 'Description', 'UOM', 'Qty/Unit', 'Unit Cost', 'Total'];
    const rows = details.map(d => [
      d.cost_element_type,
      d.resource_code || '',
      language === 'ar' ? d.description_ar : d.description_en,
      language === 'ar' ? d.uom_ar : d.uom_en,
      d.quantity_per_unit,
      d.unit_cost,
      d.total_per_unit,
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cost_breakdown_${boqItem?.system_code || 'export'}.csv`;
    link.click();
  };

  const handleImportExcel = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return;
      
      const newDetails = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
        if (cols.length >= 6) {
          newDetails.push({
            _key: `import_${Date.now()}_${i}`,
            cost_element_type: cols[0] || 'material',
            resource_code: cols[1],
            description_ar: cols[2],
            description_en: cols[2],
            uom_ar: cols[3],
            uom_en: cols[3],
            quantity_per_unit: parseFloat(cols[4]) || 0,
            unit_cost: parseFloat(cols[5]) || 0,
            total_per_unit: (parseFloat(cols[4]) || 0) * (parseFloat(cols[5]) || 0),
            line_no: i,
          });
        }
      }
      setDetails(newDetails);
      toast.success(language === 'ar' ? `تم استيراد ${newDetails.length} بند` : `Imported ${newDetails.length} items`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ newStatus, updateBOQ = false }) => {
      const totals = {
        material_cost: getTotalByType('material'),
        subcontractor_cost: getTotalByType('subcontractor'),
        labor_cost: getTotalByType('labor'),
        equipment_cost: getTotalByType('equipment'),
        services_cost: getTotalByType('service'),
        indirect_cost: getTotalByType('indirect'),
      };

      const user = await base44.auth.me();
      const now = new Date().toISOString();

      const estimationData = {
        boq_id: boqItem.id,
        ...totals,
        dry_cost_per_unit: dryCostPerUnit,
        total_dry_cost: totalDryCost,
        markup_percentage: markup,
        direct_expenses: directExpenses,
        ga_overhead: gaOverhead,
        ga_overhead_type: gaOverheadType,
        ga_overhead_amount: gaOverheadAmount,
        mw_reserve: mwReserve,
        mw_reserve_type: mwReserveType,
        mw_reserve_amount: mwReserveAmount,
        target_profit: targetProfit,
        target_profit_type: targetProfitType,
        target_profit_amount: targetProfitAmount,
        unit_selling_price: sellingPrice,
        total_selling_price: sellingPrice * boqQuantity,
        profit_amount: totalProfit,
        status: newStatus || currentEstimation?.status || 'draft',
        revision_notes: revisionNotes,
      };

      if (newStatus === 'submitted') {
        estimationData.submitted_by = user.email;
        estimationData.submitted_date = now;
      } else if (newStatus === 'approved') {
        estimationData.approved_by = user.email;
        estimationData.approved_date = now;
      } else if (newStatus === 'rejected') {
        estimationData.reviewed_by = user.email;
        estimationData.reviewed_date = now;
      }

      let estimationId;
      const shouldCreateNewVersion = currentEstimation?.status === 'approved' && newStatus !== 'approved';

      if (shouldCreateNewVersion) {
        await base44.entities.CostEstimation.update(currentEstimation.id, { is_current: false });
        const newEst = await base44.entities.CostEstimation.create({
          ...estimationData,
          version: (currentEstimation.version || 1) + 1,
          is_current: true,
        });
        estimationId = newEst.id;
      } else if (currentEstimation) {
        await base44.entities.CostEstimation.update(currentEstimation.id, { ...estimationData, is_current: true });
        estimationId = currentEstimation.id;
        for (const d of estimationDetails) {
          await base44.entities.CostEstimationDetail.delete(d.id);
        }
      } else {
        const newEst = await base44.entities.CostEstimation.create({ ...estimationData, version: 1, is_current: true });
        estimationId = newEst.id;
      }

      for (const detail of details) {
        await base44.entities.CostEstimationDetail.create({
          estimation_id: estimationId,
          line_no: detail.line_no,
          cost_element_type: detail.cost_element_type,
          resource_id: detail.resource_id || null,
          resource_code: detail.resource_code || null,
          supplier_id: detail.supplier_id || null,
          description_ar: detail.description_ar,
          description_en: detail.description_en,
          quantity_per_unit: detail.quantity_per_unit,
          uom_ar: detail.uom_ar,
          uom_en: detail.uom_en,
          unit_cost: detail.unit_cost,
          total_per_unit: detail.total_per_unit,
        });
      }

      if (updateBOQ || newStatus === 'approved') {
        await base44.entities.ProjectBOQ.update(boqItem.id, {
          unit_price: sellingPrice,
          total_amount: sellingPrice * boqQuantity,
          has_cost_breakdown: true,
          cost_estimation_id: estimationId,
        });
      }

      return { estimationId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costEstimations'] });
      queryClient.invalidateQueries({ queryKey: ['costEstimationDetails'] });
      queryClient.invalidateQueries({ queryKey: ['projectBOQ'] });
      toast.success(t('savedSuccessfully'));
    },
  });

  const toggleSection = (type) => {
    setExpandedSections(prev => prev.includes(type) ? prev.filter(s => s !== type) : [...prev, type]);
  };

  const status = currentEstimation?.status || 'draft';
  const StatusIcon = statusConfig[status]?.icon || Clock;
  const isEditable = status === 'draft' || status === 'rejected';

  if (!boqItem) return null;

  // Render cost item row
  const renderCostItemRow = (item, elementType) => {
    const key = item._key || item.id;
    const masterOptions = getMasterDataOptions(elementType);

    return (
      <div key={key} className="grid grid-cols-12 gap-2 items-center py-2 border-b border-slate-100 last:border-0">
        {/* Item Name / Master Data Select */}
        <div className="col-span-3">
          {masterOptions.length > 0 ? (
            <Select
              value={item.resource_id || ''}
              onValueChange={(v) => handleSelectMasterData(key, v, elementType)}
              disabled={!isEditable}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={language === 'ar' ? 'اختر...' : 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                {masterOptions.map(opt => {
                  const label = getMasterDataLabel(opt, elementType);
                  return (
                    <SelectItem key={opt.id} value={opt.id}>
                      <span className="font-mono text-xs text-slate-500 mr-1">{label.code}</span> {label.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={language === 'ar' ? item.description_ar : item.description_en}
              onChange={(e) => updateDetail(key, language === 'ar' ? 'description_ar' : 'description_en', e.target.value)}
              className="h-8 text-sm"
              disabled={!isEditable}
              placeholder={language === 'ar' ? 'الوصف' : 'Description'}
            />
          )}
        </div>
        {/* UOM */}
        <div className="col-span-2">
          <Input
            value={language === 'ar' ? (item.uom_ar || '') : (item.uom_en || '')}
            onChange={(e) => updateDetail(key, language === 'ar' ? 'uom_ar' : 'uom_en', e.target.value)}
            className="h-8 text-sm text-center"
            disabled={!isEditable}
            placeholder={language === 'ar' ? 'وحدة' : 'UOM'}
          />
        </div>
        {/* Qty/Unit */}
        <div className="col-span-2">
          <Input
            type="number"
            step="0.0001"
            value={item.quantity_per_unit || ''}
            onChange={(e) => updateDetail(key, 'quantity_per_unit', parseFloat(e.target.value) || 0)}
            className="h-8 text-sm text-center"
            disabled={!isEditable}
          />
        </div>
        {/* Unit Rate */}
        <div className="col-span-2">
          <Input
            type="number"
            step="0.01"
            value={item.unit_cost || ''}
            onChange={(e) => updateDetail(key, 'unit_cost', parseFloat(e.target.value) || 0)}
            className="h-8 text-sm text-center"
            disabled={!isEditable}
          />
        </div>
        {/* Total Cost */}
        <div className="col-span-2 text-right font-mono text-sm font-semibold pr-2">
          {language === 'ar' ? 'EGP' : 'EGP'} {formatNumber(item.total_per_unit || 0, 2)}
        </div>
        {/* Delete */}
        <div className="col-span-1 text-center">
          {isEditable && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDetail(key)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-base font-semibold text-slate-800">
                {language === 'ar' ? 'تحليل التكلفة' : 'Cost Breakdown'} - {boqItem.brief_description || boqItem.item_description}
              </DialogTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                <span>{language === 'ar' ? 'الكود:' : 'Code:'} <strong>{boqItem.external_code || boqItem.system_code}</strong></span>
                <span>{language === 'ar' ? 'الكمية:' : 'Quantity:'} <strong>{formatNumber(boqQuantity, 2)}</strong></span>
                <span>{language === 'ar' ? 'سعر BOQ:' : 'Base Rate:'} <strong>EGP {formatNumber(boqItem.unit_price || 0, 2)}</strong></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentEstimation && (
                <>
                  <Badge variant="outline">v{currentEstimation.version || 1}</Badge>
                  <Badge className={statusConfig[status].color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {language === 'ar' ? statusConfig[status].label_ar : statusConfig[status].label_en}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b">
            <TabsList>
              <TabsTrigger value="breakdown">
                <Calculator className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'التحليل' : 'Breakdown'}
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'السجل' : 'History'}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab: Breakdown */}
          <TabsContent value="breakdown" className="flex-1 flex overflow-hidden m-0">
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Cost Items */}
              <div className="flex-1 flex flex-col overflow-hidden border-l">
            {/* Template & Import/Export Bar */}
            <div className="px-4 py-3 bg-slate-50 border-b flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Label className="text-sm whitespace-nowrap">{language === 'ar' ? 'تطبيق قالب (اختياري)' : 'Apply Template (Optional)'}</Label>
                <Select onValueChange={applyTemplate} disabled={!isEditable}>
                  <SelectTrigger className="flex-1 max-w-xs h-9">
                    <SelectValue placeholder={language === 'ar' ? 'اختر قالب' : 'Select a template'} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {getLocalizedName(t, language, 'template_name_ar', 'template_name_en')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input type="file" accept=".csv" onChange={handleImportExcel} className="hidden" id="import-excel" />
                <Button variant="outline" size="sm" onClick={() => document.getElementById('import-excel')?.click()} disabled={!isEditable}>
                  <FileUp className="h-4 w-4 mr-1" />
                  {language === 'ar' ? 'استيراد Excel' : 'Import from Excel'}
                </Button>
                <Button variant="outline" size="sm" onClick={exportToExcel}>
                  <FileDown className="h-4 w-4 mr-1" />
                  {language === 'ar' ? 'تصدير' : 'Export'}
                </Button>
              </div>
            </div>

            {/* Cost Categories */}
            <ScrollArea className="flex-1 px-4 py-2">
              <p className="text-sm text-slate-500 mb-3">{language === 'ar' ? 'تحليل التكلفة التفصيلي لبند جدول الكميات' : 'Detailed cost analysis for BOQ item'}</p>
              
              {costElements.map(element => {
                const Icon = element.icon;
                const items = getCostsByType(element.type);
                const unitCost = getTotalByType(element.type);
                const total = unitCost;
                const isExpanded = expandedSections.includes(element.type);

                return (
                  <Collapsible key={element.type} open={isExpanded} onOpenChange={() => toggleSection(element.type)} className="mb-2">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                          <div className={cn("h-8 w-8 rounded flex items-center justify-center", element.color)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{language === 'ar' ? element.label_ar : element.label_en}</span>
                          <span className="text-sm text-slate-500">({items.length} {language === 'ar' ? 'بند' : 'items'})</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-500">{language === 'ar' ? 'تكلفة الوحدة:' : 'Unit Cost:'} EGP {formatNumber(unitCost, 2)}</span>
                          <span className="font-mono font-semibold">EGP {formatNumber(total, 2)}</span>
                          {isEditable && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); addDetail(element.type); }}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-1 mx-2 p-3 bg-slate-50 rounded-lg">
                        {/* Header */}
                        <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 font-medium mb-2 pb-2 border-b">
                          <div className="col-span-3">{language === 'ar' ? 'اسم البند' : 'Item Name'}</div>
                          <div className="col-span-2 text-center">{language === 'ar' ? 'الوحدة' : 'UoM'}</div>
                          <div className="col-span-2 text-center">{language === 'ar' ? 'كمية/وحدة' : 'Qty/Unit'}</div>
                          <div className="col-span-2 text-center">{language === 'ar' ? 'سعر الوحدة' : 'Unit Rate'}</div>
                          <div className="col-span-2 text-right">{language === 'ar' ? 'إجمالي التكلفة' : 'Total Cost'}</div>
                          <div className="col-span-1"></div>
                        </div>
                        {/* Items */}
                        {items.map(item => renderCostItemRow(item, element.type))}
                        {items.length === 0 && (
                          <p className="text-sm text-slate-400 text-center py-4">
                            {language === 'ar' ? 'لا توجد بنود - اضغط + لإضافة' : 'No items - Click + to add'}
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </ScrollArea>
              </div>

              {/* Right: Cost Summary Panel */}
              <div className="w-72 bg-slate-50 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-slate-800">{language === 'ar' ? 'هيكل تحليل التكلفة' : 'Cost Breakdown Structure'}</h3>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {/* Dry Cost */}
              <div>
                <Label className="text-xs text-slate-500">{language === 'ar' ? 'التكلفة الجافة' : 'Dry Cost'}</Label>
                <div className="text-lg font-bold text-slate-800 font-mono">EGP {formatNumber(dryCostWithExpenses, 2)}</div>
              </div>

              {/* Direct Expenses & Site Overhead */}
              <div>
                <Label className="text-xs text-slate-500">{language === 'ar' ? 'مصاريف مباشرة وعلاوات موقع' : 'Direct Expenses & Site OH'}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={directExpenses || ''}
                  onChange={(e) => setDirectExpenses(parseFloat(e.target.value) || 0)}
                  className="mt-1 font-mono h-8"
                  disabled={!isEditable}
                  placeholder="0.00"
                />
              </div>

              <Separator />

              {/* G&A Overhead */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-500">{language === 'ar' ? 'مصاريف إدارية وعمومية' : 'G&A Overhead'}</Label>
                  <Select value={gaOverheadType} onValueChange={setGaOverheadType} disabled={!isEditable}>
                    <SelectTrigger className="h-6 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="lumpsum">{language === 'ar' ? 'مبلغ' : 'Lump'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={gaOverhead || ''}
                  onChange={(e) => setGaOverhead(parseFloat(e.target.value) || 0)}
                  className="mt-1 font-mono h-8"
                  disabled={!isEditable}
                  placeholder="0"
                />
                <div className="text-xs text-slate-500 mt-0.5 font-mono">= EGP {formatNumber(gaOverheadAmount, 2)}</div>
              </div>

              {/* M&W Reserve */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-500">{language === 'ar' ? 'احتياطي صيانة وضمان' : 'M&W Reserve'}</Label>
                  <Select value={mwReserveType} onValueChange={setMwReserveType} disabled={!isEditable}>
                    <SelectTrigger className="h-6 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="lumpsum">{language === 'ar' ? 'مبلغ' : 'Lump'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={mwReserve || ''}
                  onChange={(e) => setMwReserve(parseFloat(e.target.value) || 0)}
                  className="mt-1 font-mono h-8"
                  disabled={!isEditable}
                  placeholder="0"
                />
                <div className="text-xs text-slate-500 mt-0.5 font-mono">= EGP {formatNumber(mwReserveAmount, 2)}</div>
              </div>

              <Separator />

              {/* Target Profit Margin */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-500 flex items-center gap-1">
                    {language === 'ar' ? 'هامش ربح مستهدف' : 'Target Profit Margin'}
                    <span className="text-amber-500">🔗</span>
                  </Label>
                  <Select value={targetProfitType} onValueChange={setTargetProfitType} disabled={!isEditable}>
                    <SelectTrigger className="h-6 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="lumpsum">{language === 'ar' ? 'مبلغ' : 'Lump'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={targetProfit || ''}
                  onChange={(e) => setTargetProfit(parseFloat(e.target.value) || 0)}
                  className="mt-1 font-mono h-8"
                  disabled={!isEditable}
                  placeholder="0"
                />
                <div className="text-xs text-slate-500 mt-0.5 font-mono">= EGP {formatNumber(targetProfitAmount, 2)}</div>
              </div>

              {/* Two-way arrow */}
              <div className="flex justify-center">
                <ArrowUpDown className="h-5 w-5 text-slate-400" />
              </div>

              {/* Unit Selling Price (editable - bidirectional sync) */}
              <div>
                <Label className="text-xs text-slate-500 flex items-center gap-1">
                  {language === 'ar' ? 'سعر البيع للوحدة' : 'Unit Selling Price'}
                  <span className="text-amber-500">🔗</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => handleSellingPriceChange(e.target.value)}
                  className="mt-1 font-mono font-semibold"
                  disabled={!isEditable}
                />
              </div>

              {/* Total Selling Price */}
              <div>
                <Label className="text-xs text-slate-500">{language === 'ar' ? 'إجمالي سعر البيع' : 'Total Selling Price'}</Label>
                <div className="text-lg font-bold text-slate-800 font-mono">EGP {formatNumber(sellingPrice * boqQuantity, 2)}</div>
              </div>

              <Separator />

              {/* Profit Box */}
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-3">
                  <Label className="text-xs text-emerald-700">{language === 'ar' ? 'الربح' : 'Profit'}</Label>
                  <div className="text-xl font-bold text-emerald-700 font-mono">EGP {formatNumber(totalProfit, 2)}</div>
                  <div className="text-sm text-emerald-600">{formatNumber(profitMargin, 1)}% {language === 'ar' ? 'هامش الربح' : 'Profit Margin'}</div>
                </CardContent>
              </Card>

              {/* Version */}
              <div className="text-xs text-slate-400">
                {language === 'ar' ? 'الإصدار:' : 'Version:'} {currentEstimation?.version || 1}
              </div>
            </div>

              {/* Save as Template */}
              {isEditable && details.length > 0 && (
                <Button variant="outline" className="w-full mt-4" onClick={() => setShowSaveTemplateDialog(true)}>
                  <BookmarkPlus className="h-4 w-4 mr-1" />
                  {language === 'ar' ? 'حفظ كقالب' : 'Save as Template'}
                </Button>
              )}

              {/* Create RFQ */}
              {details.length > 0 && details.some(d => d.cost_element_type === 'material' || d.cost_element_type === 'subcontractor') && (
                <Button variant="outline" className="w-full mt-2" onClick={() => setShowRFQModal(true)}>
                  <FileText className="h-4 w-4 mr-1" />
                  {language === 'ar' ? 'إنشاء RFQ' : 'Create RFQ'}
                </Button>
              )}
              </div>
            </div>
          </TabsContent>

          {/* Tab: History */}
          <TabsContent value="history" className="flex-1 overflow-hidden m-0">
            <CostBreakdownHistoryTab boqItem={boqItem} />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-white flex gap-2">
          <div className="flex-1"></div>

          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>

          {status === 'draft' && (
            <>
              <Button onClick={() => saveMutation.mutate({ newStatus: 'draft' })} disabled={saveMutation.isPending} variant="outline">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                <Save className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'حفظ' : 'Save'}
              </Button>
              <Button onClick={() => saveMutation.mutate({ newStatus: 'submitted' })} disabled={saveMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
                <Send className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'تقديم' : 'Submit'}
              </Button>
            </>
          )}

          {status === 'submitted' && (
            <>
              <Button onClick={() => saveMutation.mutate({ newStatus: 'rejected' })} disabled={saveMutation.isPending} variant="destructive">
                <XCircle className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'رفض' : 'Reject'}
              </Button>
              <Button onClick={() => saveMutation.mutate({ newStatus: 'approved', updateBOQ: true })} disabled={saveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'اعتماد' : 'Approve'}
              </Button>
            </>
          )}

          {status === 'rejected' && (
            <Button onClick={() => saveMutation.mutate({ newStatus: 'submitted' })} disabled={saveMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
              <RefreshCw className="h-4 w-4 mr-1" />
              {language === 'ar' ? 'إعادة تقديم' : 'Resubmit'}
            </Button>
          )}

          {status === 'approved' && (
            <Button onClick={() => saveMutation.mutate({ newStatus: 'draft' })} disabled={saveMutation.isPending} variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              {language === 'ar' ? 'نسخة جديدة' : 'New Version'}
            </Button>
          )}
        </DialogFooter>

        {/* Save Template Dialog */}
        {showSaveTemplateDialog && (
          <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{language === 'ar' ? 'حفظ كقالب' : 'Save as Template'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>{language === 'ar' ? 'اسم القالب' : 'Template Name'}</Label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={language === 'ar' ? 'أدخل اسم القالب' : 'Enter template name'}
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>
                  {t('cancel')}
                </Button>
                <Button onClick={saveAsTemplate}>
                  <Save className="h-4 w-4 mr-1" />
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Create RFQ Modal */}
        <CreateRFQFromCostBreakdownModal
          open={showRFQModal}
          onClose={() => setShowRFQModal(false)}
          boqItem={boqItem}
          costDetails={details}
        />
      </DialogContent>
    </Dialog>
  );
}