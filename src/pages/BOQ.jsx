import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext.jsx';
import { useCompany } from '@/components/shared/CompanyContext.jsx';
import { formatNumber, formatCurrency } from '@/components/shared/formatters';
import { cn } from "@/lib/utils";
import PageHeader from '@/components/shared/PageHeader';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import BOQExcelImport from '@/components/boq/BOQExcelImport';
import { exportBOQToExcel } from '@/components/boq/BOQExcelExport';

// Lazy load heavy modals
const CostBreakdownModal = lazy(() => import('@/components/boq/CostBreakdownModal'));
const SaveTemplateModal = lazy(() => import('@/components/boq/SaveTemplateModal'));
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Download,
  Upload,
  FileSpreadsheet,
  Wallet,
  Pencil,
  Trash2,
  FileText,
  ShoppingCart,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  GripVertical,
  AlertTriangle,
  Save,
  Copy,
  CheckSquare,
  Square,
  Expand,
  Minimize,
  FileCheck,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from "sonner";

const initialFormData = {
  item_description: '',
  external_code: '',
  quantity: '',
  uom: '',
  unit_price: '',
  notes: '',
  has_cost_breakdown: false,
  work_category_id: '',
};

export default function BOQ() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [selectedProject, setSelectedProject] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [addLevel, setAddLevel] = useState(3);
  const [parentId, setParentId] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [deleteWarning, setDeleteWarning] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [costBreakdownItem, setCostBreakdownItem] = useState(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateItem, setTemplateItem] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);

  const companyFilter = currentCompany ? { company_id: currentCompany.id } : {};

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.Project.filter(companyFilter) : base44.entities.Project.list(),
  });

  const { data: workCategories = [] } = useQuery({
    queryKey: ['workCategories', currentCompany?.id],
    queryFn: () => base44.entities.WorkCategory.list(),
  });

  const { data: boqItems = [], isLoading } = useQuery({
    queryKey: ['projectBOQ', selectedProject],
    queryFn: () => selectedProject ? base44.entities.ProjectBOQ.filter({ project_id: selectedProject }, 'sort_order', 2000) : Promise.resolve([]),
    enabled: !!selectedProject,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectBOQ.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectBOQ'] });
      setShowModal(false);
      toast.success(language === 'ar' ? 'تم إضافة البند بنجاح' : 'Item added successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectBOQ.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectBOQ'] });
      setShowModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const itemsToDelete = getDescendantIds(id);
      itemsToDelete.push(id);
      for (const itemId of itemsToDelete.reverse()) {
        await base44.entities.ProjectBOQ.delete(itemId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectBOQ'] });
      setShowDelete(false);
      setDeleteWarning(null);
      toast.success(language === 'ar' ? 'تم حذف البند بنجاح' : 'Item deleted successfully');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        const descendants = getDescendantIds(id);
        for (const descId of [...descendants, id].reverse()) {
          await base44.entities.ProjectBOQ.delete(descId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectBOQ'] });
      setShowBulkDelete(false);
      setSelectedItems([]);
      toast.success(language === 'ar' ? 'تم حذف البنود المحددة' : 'Selected items deleted');
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

  // Build hierarchical structure
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

  // Flatten for easy iteration
  const flattenedItems = useMemo(() => {
    const result = [];
    const flatten = (items, depth = 0) => {
      items.forEach(item => {
        result.push({ ...item, depth });
        if (expandedItems[item.id] !== false && item.children?.length) {
          flatten(item.children, depth + 1);
        }
      });
    };
    flatten(hierarchicalData);
    return result;
  }, [hierarchicalData, expandedItems]);

  // Calculate subtotals
  const calculateSubtotal = (item) => {
    if (item.level === 3) {
      return (item.quantity || 0) * (item.unit_price || 0);
    }
    return item.children.reduce((sum, child) => sum + calculateSubtotal(child), 0);
  };

  const grandTotal = hierarchicalData.reduce((sum, item) => sum + calculateSubtotal(item), 0);

  // Get siblings for move operations
  const getSiblings = (item) => {
    if (!item.parent_boq_id) {
      return hierarchicalData;
    }
    const parent = boqItems.find(i => i.id === item.parent_boq_id);
    if (!parent) return [];
    const parentInHierarchy = findItemInHierarchy(hierarchicalData, parent.id);
    return parentInHierarchy?.children || [];
  };

  const findItemInHierarchy = (items, id) => {
    for (const item of items) {
      if (item.id === id) return item;
      const found = findItemInHierarchy(item.children, id);
      if (found) return found;
    }
    return null;
  };

  // Move item up or down
  const handleMoveItem = async (item, direction) => {
    const siblings = getSiblings(item);
    const currentIndex = siblings.findIndex(s => s.id === item.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= siblings.length) return;
    
    const swapItem = siblings[newIndex];
    
    await base44.entities.ProjectBOQ.update(item.id, { sort_order: swapItem.sort_order || newIndex });
    await base44.entities.ProjectBOQ.update(swapItem.id, { sort_order: item.sort_order || currentIndex });
    
    queryClient.invalidateQueries({ queryKey: ['projectBOQ'] });
    toast.success(language === 'ar' ? 'تم نقل البند' : 'Item moved');
  };

  // Drag and Drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetItem) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) return;
    if (draggedItem.level !== targetItem.level) return;
    if (draggedItem.parent_boq_id !== targetItem.parent_boq_id) return;
  };

  const handleDrop = async (e, targetItem) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) return;
    if (draggedItem.level !== targetItem.level) return;
    if (draggedItem.parent_boq_id !== targetItem.parent_boq_id) return;

    const siblings = getSiblings(draggedItem);
    const dragIndex = siblings.findIndex(s => s.id === draggedItem.id);
    const targetIndex = siblings.findIndex(s => s.id === targetItem.id);

    // Reorder all siblings
    const reordered = [...siblings];
    reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, draggedItem);

    for (let i = 0; i < reordered.length; i++) {
      await base44.entities.ProjectBOQ.update(reordered[i].id, { sort_order: i + 1 });
    }

    setDraggedItem(null);
    queryClient.invalidateQueries({ queryKey: ['projectBOQ'] });
    toast.success(language === 'ar' ? 'تم إعادة الترتيب' : 'Reordered');
  };

  const handleAddItem = (level, parent = null) => {
    setEditingItem(null);
    setAddLevel(level);
    setParentId(parent?.id || null);
    
    const nextCode = generateCode(level, parent);
    setFormData({
      ...initialFormData,
      external_code: nextCode,
    });
    setShowModal(true);
  };

  const generateCode = (level, parent) => {
    if (!parent) {
      const existingLevel1 = boqItems.filter(i => i.level === 1).length;
      return String(existingLevel1 + 1);
    }
    if (parent && level === 2) {
      const siblings = boqItems.filter(i => i.parent_boq_id === parent.id).length;
      return `${parent.external_code || parent.system_code}.${siblings + 1}`;
    }
    if (parent && level === 3) {
      const siblings = boqItems.filter(i => i.parent_boq_id === parent.id).length;
      return `${parent.external_code || parent.system_code}.${siblings + 1}`;
    }
    return '';
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setAddLevel(item.level);
    setParentId(item.parent_boq_id);
    setFormData({
      item_description: item.item_description || '',
      external_code: item.external_code || '',
      quantity: item.quantity || '',
      uom: item.uom || '',
      unit_price: item.unit_price || '',
      notes: item.notes || '',
      has_cost_breakdown: item.has_cost_breakdown || false,
      work_category_id: item.work_category_id || '',
    });
    setShowModal(true);
  };

  const handleDelete = (item) => {
    const descendants = getDescendantIds(item.id);
    if (descendants.length > 0) {
      setDeleteWarning({ item, childCount: descendants.length });
    }
    setEditingItem(item);
    setShowDelete(true);
  };

  const handleSave = () => {
    const total = addLevel === 3 ? (parseFloat(formData.quantity) || 0) * (parseFloat(formData.unit_price) || 0) : null;
    
    const data = {
      project_id: selectedProject,
      parent_boq_id: parentId,
      level: addLevel,
      system_code: formData.external_code || `BOQ-${Date.now()}`,
      external_code: formData.external_code,
      work_category_id: formData.work_category_id || null,
      item_description: formData.item_description,
      quantity: addLevel === 3 ? parseFloat(formData.quantity) || null : null,
      uom: addLevel === 3 ? formData.uom : null,
      unit_price: addLevel === 3 ? parseFloat(formData.unit_price) || null : null,
      total_amount: total,
      notes: formData.notes,
      has_cost_breakdown: formData.has_cost_breakdown,
      sort_order: editingItem?.sort_order || (boqItems.filter(i => i.parent_boq_id === parentId).length + 1)
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleExpand = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const expandAll = () => {
    const newExpanded = {};
    boqItems.forEach(item => {
      if (item.level < 3) newExpanded[item.id] = true;
    });
    setExpandedItems(newExpanded);
  };

  const collapseAll = () => {
    setExpandedItems({});
  };

  const toggleSelect = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAll = () => {
    const level3Items = boqItems.filter(i => i.level === 3).map(i => i.id);
    setSelectedItems(level3Items);
  };

  const deselectAll = () => {
    setSelectedItems([]);
  };

  const handleExport = () => {
    const project = projects.find(p => p.id === selectedProject);
    const result = exportBOQToExcel(boqItems, project?.project_code, language);
    if (result.success) {
      toast.success(language === 'ar' ? `تم تصدير ${result.itemCount} بند بنجاح` : `${result.itemCount} items exported successfully`);
    }
  };

  const handleOpenCostBreakdown = (item) => {
    setCostBreakdownItem(item);
    setShowCostBreakdown(true);
  };

  const handleSaveAsTemplate = (item) => {
    setTemplateItem(item);
    setShowSaveTemplate(true);
  };

  const handleInlineUpdate = async (itemId, updates) => {
    await base44.entities.ProjectBOQ.update(itemId, updates);
    queryClient.invalidateQueries({ queryKey: ['projectBOQ'] });
  };

  const handleDuplicateItem = async (item) => {
    const newItem = {
      ...item,
      id: undefined,
      external_code: `${item.external_code || item.system_code}-copy`,
      system_code: `BOQ-${Date.now()}`,
      sort_order: (item.sort_order || 0) + 1,
    };
    delete newItem.children;
    delete newItem.created_date;
    delete newItem.updated_date;
    delete newItem.created_by;

    await base44.entities.ProjectBOQ.create(newItem);
    queryClient.invalidateQueries({ queryKey: ['projectBOQ'] });
    toast.success(language === 'ar' ? 'تم نسخ البند' : 'Item duplicated');
  };

  const handleCreateRFQ = async () => {
    if (selectedItems.length === 0) {
      toast.error(language === 'ar' ? 'اختر بنود أولاً' : 'Select items first');
      return;
    }

    const selectedBoqItems = boqItems.filter(i => selectedItems.includes(i.id));
    const project = projects.find(p => p.id === selectedProject);

    const rfq = await base44.entities.RFQ.create({
      company_id: currentCompany?.id,
      project_id: selectedProject,
      rfq_number: `RFQ-${Date.now()}`,
      rfq_date: new Date().toISOString().split('T')[0],
      status: 'draft',
      notes: `${language === 'ar' ? 'طلب تسعير لـ' : 'RFQ for'} ${selectedBoqItems.length} ${language === 'ar' ? 'بند' : 'items'}`,
    });

    for (const item of selectedBoqItems) {
      await base44.entities.RFQItem.create({
        rfq_id: rfq.id,
        boq_id: item.id,
        item_description: item.item_description,
        quantity: item.quantity,
        uom: item.uom,
      });
      await base44.entities.ProjectBOQ.update(item.id, {
        is_selected_for_rfq: true,
        linked_rfq_id: rfq.id,
        rfq_status: 'pending',
      });
    }

    queryClient.invalidateQueries({ queryKey: ['projectBOQ'] });
    setSelectedItems([]);
    toast.success(language === 'ar' ? 'تم إنشاء طلب التسعير' : 'RFQ created');
  };

  const renderBOQItem = (item, depth = 0) => {
    const isExpanded = expandedItems[item.id] !== false;
    const hasChildren = item.children && item.children.length > 0;
    const isSelected = selectedItems.includes(item.id);
    const subtotal = calculateSubtotal(item);
    const siblings = getSiblings(item);
    const currentIndex = siblings.findIndex(s => s.id === item.id);
    const canMoveUp = currentIndex > 0;
    const canMoveDown = currentIndex < siblings.length - 1;

    return (
      <React.Fragment key={item.id}>
        <tr
          draggable
          onDragStart={(e) => handleDragStart(e, item)}
          onDragOver={(e) => handleDragOver(e, item)}
          onDrop={(e) => handleDrop(e, item)}
          className={cn(
            "border-b hover:bg-slate-50 transition-colors cursor-move",
            item.level === 1 && "bg-slate-100 font-semibold",
            item.level === 2 && "bg-slate-50",
            isSelected && "bg-amber-50 border-l-4 border-l-amber-400",
            draggedItem?.id === item.id && "opacity-50"
          )}
        >
          {/* Checkbox */}
          <td className="p-2 w-10">
            <div className="flex items-center gap-1">
              <GripVertical className="h-4 w-4 text-slate-400 cursor-grab" />
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleSelect(item.id)}
              />
            </div>
          </td>
          
          {/* Code */}
          <td className="p-2 w-32">
            <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
              {hasChildren && (
                <button 
                  onClick={() => toggleExpand(item.id)} 
                  className="p-0.5 hover:bg-slate-200 rounded"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
              {!hasChildren && item.level < 3 && <span className="w-5" />}
              <span className={cn(
                item.level === 1 && 'text-red-600 font-bold',
                item.level === 2 && 'text-amber-600 font-medium',
                item.level === 3 && 'text-green-600'
              )}>
                {item.external_code || item.system_code}
              </span>
            </div>
          </td>
          
          {/* Description */}
          <td className="p-2">
            <div style={{ paddingRight: isRTL ? 0 : depth * 20, paddingLeft: isRTL ? depth * 20 : 0 }}>
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0">
                  {item.level === 1 ? '🔴' : item.level === 2 ? '🟡' : '🟢'}
                </span>
                <span 
                  className="flex-1 min-w-0 cursor-pointer hover:text-blue-600"
                  onDoubleClick={() => handleEdit(item)}
                >
                  {item.item_description}
                </span>
                {item.has_cost_breakdown && (
                  <Badge variant="outline" className="text-xs flex-shrink-0 bg-blue-50">
                    💰 {language === 'ar' ? 'تحليل' : 'CBD'}
                  </Badge>
                )}
                {item.is_selected_for_rfq && (
                  <Badge variant="outline" className="text-xs flex-shrink-0 bg-amber-50">
                    📋 RFQ
                  </Badge>
                )}
              </div>
            </div>
          </td>
          
          {/* UOM */}
          <td className="p-2 w-20 text-center">
            {item.level === 3 ? item.uom || '-' : '-'}
          </td>
          
          {/* Quantity */}
          <td className="p-2 w-28 text-center font-mono">
            {item.level === 3 ? formatNumber(item.quantity, 2) : '-'}
          </td>
          
          {/* Unit Price */}
          <td className="p-2 w-32 text-center font-mono">
            {item.level === 3 ? (
              <span className={item.unit_price < 0 ? 'text-red-600' : ''}>
                {formatNumber(item.unit_price, 2)}
              </span>
            ) : '-'}
          </td>
          
          {/* Total */}
          <td className="p-2 w-36 text-center font-medium font-mono">
            {item.level === 3 ? (
              <span className={subtotal < 0 ? 'text-red-600' : ''}>
                {formatNumber(subtotal, 2)}
              </span>
            ) : (
              <span className="text-slate-500 text-xs">
                Σ {formatNumber(subtotal, 2)}
              </span>
            )}
          </td>
          
          {/* Actions */}
          <td className="p-2 w-44">
            <div className={cn("flex items-center gap-0.5", isRTL && "flex-row-reverse")}>
              {item.level === 3 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7" 
                  title={language === 'ar' ? 'تحليل التكلفة' : 'Cost Breakdown'}
                  onClick={() => handleOpenCostBreakdown(item)}
                >
                  <Wallet className="h-4 w-4 text-blue-600" />
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => handleEdit(item)}
              >
                <Pencil className="h-4 w-4 text-slate-500" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => handleDelete(item)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
              
              {item.level < 3 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => handleAddItem(item.level + 1, item)}
                  title={language === 'ar' ? 'إضافة بند فرعي' : 'Add Sub-item'}
                >
                  <Plus className="h-4 w-4 text-green-600" />
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleMoveItem(item, 'up')} disabled={!canMoveUp}>
                    <ArrowUp className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'نقل لأعلى' : 'Move Up'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMoveItem(item, 'down')} disabled={!canMoveDown}>
                    <ArrowDown className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'نقل لأسفل' : 'Move Down'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDuplicateItem(item)}>
                    <Copy className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'نسخ' : 'Duplicate'}
                  </DropdownMenuItem>
                  {item.level === 3 && item.has_cost_breakdown && (
                    <DropdownMenuItem onClick={() => handleSaveAsTemplate(item)}>
                      <Save className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'حفظ كقالب' : 'Save as Template'}
                    </DropdownMenuItem>
                  )}
                  {item.level === 3 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        setSelectedItems([item.id]);
                        handleCreateRFQ();
                      }}>
                        <FileText className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'إنشاء RFQ' : 'Create RFQ'}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'إنشاء أمر شراء' : 'Create PO'}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </td>
        </tr>
        
        {/* Children */}
        {isExpanded && hasChildren && item.children.map(child => renderBOQItem(child, depth + 1))}
        
        {/* Subtotal Row for Level 2 */}
        {isExpanded && item.level === 2 && hasChildren && (
          <tr className="bg-amber-50 border-b font-medium">
            <td colSpan="6" className={cn("p-2", isRTL ? "text-left" : "text-right")}>
              {language === 'ar' ? `إجمالي: ${item.item_description}` : `Total: ${item.item_description}`}
            </td>
            <td className="p-2 text-center text-amber-700 font-mono">
              {formatNumber(subtotal, 2)}
            </td>
            <td></td>
          </tr>
        )}
        
        {/* Subtotal Row for Level 1 */}
        {isExpanded && item.level === 1 && hasChildren && (
          <tr className="bg-red-50 border-b font-bold">
            <td colSpan="6" className={cn("p-2", isRTL ? "text-left" : "text-right")}>
              {language === 'ar' ? `إجمالي: ${item.item_description}` : `TOTAL: ${item.item_description}`}
            </td>
            <td className="p-2 text-center text-red-700 font-mono">
              {formatNumber(subtotal, 2)}
            </td>
            <td></td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={language === 'ar' ? 'جدول الكميات BOQ' : 'Bill of Quantities (BOQ)'}
        subtitle={language === 'ar' ? 'إدارة جدول الكميات للمشروعات' : 'Manage project bills of quantities'}
      >
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={language === 'ar' ? 'اختر مشروع' : 'Select Project'} />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.project_code} - {project.project_name_ar || project.project_name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {selectedProject && (
        <Card>
          <CardHeader className="pb-3">
            <div className={cn("flex items-center justify-between flex-wrap gap-2", isRTL && "flex-row-reverse")}>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">
                  {language === 'ar' ? 'بنود جدول الكميات' : 'BOQ Items'}
                </CardTitle>
                <Badge variant="outline">{boqItems.length} {language === 'ar' ? 'بند' : 'items'}</Badge>
              </div>
              
              <div className={cn("flex items-center gap-2 flex-wrap", isRTL && "flex-row-reverse")}>
                {/* Selection Controls */}
                {selectedItems.length > 0 && (
                  <div className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                    <span className="text-sm font-medium text-amber-700">
                      {selectedItems.length} {language === 'ar' ? 'محدد' : 'selected'}
                    </span>
                    <Button variant="ghost" size="sm" onClick={deselectAll} className="h-7">
                      <X className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setShowBulkDelete(true)} className="h-7">
                      <Trash2 className="h-4 w-4 mr-1" />
                      {language === 'ar' ? 'حذف' : 'Delete'}
                    </Button>
                    <Button size="sm" onClick={handleCreateRFQ} className="h-7 bg-blue-600 hover:bg-blue-700">
                      <FileText className="h-4 w-4 mr-1" />
                      {language === 'ar' ? 'إنشاء RFQ' : 'Create RFQ'}
                    </Button>
                  </div>
                )}

                {/* Expand/Collapse */}
                <div className="flex items-center gap-1 border rounded-lg">
                  <Button variant="ghost" size="sm" onClick={expandAll} className="h-8" title={language === 'ar' ? 'توسيع الكل' : 'Expand All'}>
                    <Expand className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={collapseAll} className="h-8" title={language === 'ar' ? 'طي الكل' : 'Collapse All'}>
                    <Minimize className="h-4 w-4" />
                  </Button>
                </div>

                {/* Select All */}
                <Button variant="outline" size="sm" onClick={selectedItems.length > 0 ? deselectAll : selectAll} className="h-8">
                  {selectedItems.length > 0 ? <Square className="h-4 w-4 mr-1" /> : <CheckSquare className="h-4 w-4 mr-1" />}
                  {language === 'ar' ? 'تحديد الكل' : 'Select All'}
                </Button>

                <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)} className="h-8">
                  <Upload className="h-4 w-4 mr-1" />
                  {language === 'ar' ? 'استيراد' : 'Import'}
                </Button>
                
                <Button variant="outline" size="sm" onClick={handleExport} disabled={!boqItems.length} className="h-8">
                  <Download className="h-4 w-4 mr-1" />
                  {language === 'ar' ? 'تصدير' : 'Export'}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-1" />
                      {language === 'ar' ? 'إضافة بند' : 'Add Item'}
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAddItem(1)}>
                      <span className="mr-2">🔴</span>
                      {language === 'ar' ? 'قسم رئيسي (Level 1)' : 'Main Section (Level 1)'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddItem(2)}>
                      <span className="mr-2">🟡</span>
                      {language === 'ar' ? 'مجموعة (Level 2)' : 'Group (Level 2)'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddItem(3)}>
                      <span className="mr-2">🟢</span>
                      {language === 'ar' ? 'بند (Level 3)' : 'Line Item (Level 3)'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-y sticky top-0">
                  <tr>
                    <th className="p-2 w-10">
                      <Checkbox 
                        checked={selectedItems.length > 0 && selectedItems.length === boqItems.filter(i => i.level === 3).length}
                        onCheckedChange={(checked) => checked ? selectAll() : deselectAll()}
                      />
                    </th>
                    <th className="p-2 text-right w-32">{language === 'ar' ? 'الكود' : 'Code'}</th>
                    <th className="p-2 text-right">{language === 'ar' ? 'الوصف' : 'Description'}</th>
                    <th className="p-2 text-center w-20">{language === 'ar' ? 'الوحدة' : 'UOM'}</th>
                    <th className="p-2 text-center w-28">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                    <th className="p-2 text-center w-32">{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</th>
                    <th className="p-2 text-center w-36">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                    <th className="p-2 w-44">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {hierarchicalData.map(item => renderBOQItem(item))}
                  
                  {/* Grand Total */}
                  {hierarchicalData.length > 0 && (
                    <tr className="bg-blue-100 font-bold text-blue-900 sticky bottom-0">
                      <td colSpan="6" className={cn("p-3", isRTL ? "text-left" : "text-right")}>
                        📊 {language === 'ar' ? 'الإجمالي الكلي لجدول الكميات' : 'GRAND TOTAL BOQ'}
                      </td>
                      <td className="p-3 text-center text-lg font-mono">
                        {formatCurrency(grandTotal)}
                      </td>
                      <td></td>
                    </tr>
                  )}
                  
                  {hierarchicalData.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <FileSpreadsheet className="h-12 w-12 text-slate-300" />
                          <p>{language === 'ar' ? 'لا توجد بنود. اضغط على "إضافة بند" للبدء أو استيراد من Excel.' : 'No items. Click "Add Item" to start or import from Excel.'}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedProject && (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <FileSpreadsheet className="h-16 w-16 text-slate-300" />
            <p className="text-slate-500">
              {language === 'ar' ? 'اختر مشروع لعرض جدول الكميات' : 'Select a project to view its BOQ'}
            </p>
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <FormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={
          editingItem 
            ? (language === 'ar' ? 'تعديل بند' : 'Edit Item')
            : (language === 'ar' ? `إضافة بند - المستوى ${addLevel}` : `Add Item - Level ${addLevel}`)
        }
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
            <span>{addLevel === 1 ? '🔴' : addLevel === 2 ? '🟡' : '🟢'}</span>
            <span className="text-sm font-medium">
              {addLevel === 1 ? (language === 'ar' ? 'قسم رئيسي' : 'Main Section') :
               addLevel === 2 ? (language === 'ar' ? 'مجموعة' : 'Group') :
               (language === 'ar' ? 'بند' : 'Line Item')}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الكود الخارجي' : 'External Code'}</Label>
              <Input
                value={formData.external_code}
                onChange={(e) => setFormData({ ...formData, external_code: e.target.value })}
                placeholder="1.1.1"
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'التصنيف' : 'Classification'}</Label>
              <Select 
                value={formData.work_category_id} 
                onValueChange={(v) => setFormData({ ...formData, work_category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر...' : 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                  {workCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.category_name_ar || cat.category_name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الوصف' : 'Description'} *</Label>
            <Textarea
              value={formData.item_description}
              onChange={(e) => setFormData({ ...formData, item_description: e.target.value })}
              placeholder={language === 'ar' ? 'وصف البند (عربي/إنجليزي)' : 'Item description (Arabic/English)'}
              rows={3}
            />
          </div>
          
          {addLevel === 3 && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الكمية' : 'Quantity'} *</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'وحدة القياس' : 'UOM'}</Label>
                  <Input
                    value={formData.uom}
                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                    placeholder="م³ / m³"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</Label>
                  <Input
                    type="number"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  />
                </div>
              </div>
              
              {formData.quantity && formData.unit_price && (
                <div className="p-3 bg-blue-50 rounded">
                  <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                    <span className="text-sm text-slate-600">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span className="font-bold text-blue-700">
                      {formatCurrency((parseFloat(formData.quantity) || 0) * (parseFloat(formData.unit_price) || 0))}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
          
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>
      </FormModal>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={showDelete}
        onClose={() => { setShowDelete(false); setDeleteWarning(null); }}
        onConfirm={() => deleteMutation.mutate(editingItem?.id)}
        isDeleting={deleteMutation.isPending}
        title={deleteWarning ? (language === 'ar' ? 'تحذير: حذف مع البنود الفرعية' : 'Warning: Delete with Children') : undefined}
        description={deleteWarning ? (
          language === 'ar' 
            ? `سيتم حذف هذا البند مع ${deleteWarning.childCount} بند فرعي. هل أنت متأكد؟`
            : `This will delete this item along with ${deleteWarning.childCount} child item(s). Are you sure?`
        ) : undefined}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {language === 'ar' ? 'حذف متعدد' : 'Bulk Delete'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? `هل أنت متأكد من حذف ${selectedItems.length} بند؟ هذا الإجراء لا يمكن التراجع عنه.`
                : `Are you sure you want to delete ${selectedItems.length} items? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => bulkDeleteMutation.mutate(selectedItems)}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkDeleteMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excel Import Modal */}
      <BOQExcelImport
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        projectId={selectedProject}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['projectBOQ'] })}
      />

      {/* Cost Breakdown Modal */}
      {showCostBreakdown && costBreakdownItem && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>}>
          <CostBreakdownModal
            open={showCostBreakdown}
            onClose={() => {
              setShowCostBreakdown(false);
              setCostBreakdownItem(null);
            }}
            boqItem={costBreakdownItem}
          />
        </Suspense>
      )}

      {/* Save Template Modal */}
      {showSaveTemplate && templateItem && (
        <Suspense fallback={null}>
          <SaveTemplateModal
            open={showSaveTemplate}
            onClose={() => {
              setShowSaveTemplate(false);
              setTemplateItem(null);
            }}
            boqItem={templateItem}
          />
        </Suspense>
      )}
    </div>
  );
}