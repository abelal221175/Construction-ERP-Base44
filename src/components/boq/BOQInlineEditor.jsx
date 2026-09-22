import React, { useState, useRef, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/shared/LanguageContext';
import { formatNumber, formatCurrency } from '@/components/shared/formatters';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Wallet,
  Pencil,
  Trash2,
  Plus,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Copy,
  ClipboardPaste,
  FileText,
  ShoppingCart,
  Check,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { cn } from "@/lib/utils";

// Cost Breakdown Status Badge Component
function CostBreakdownStatusBadge({ item, language }) {
  const [estimation, setEstimation] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (item.has_cost_breakdown && item.cost_estimation_id) {
      setLoading(true);
      base44.entities.CostEstimation.filter({ id: item.cost_estimation_id })
        .then(data => {
          if (data.length > 0) setEstimation(data[0]);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [item.has_cost_breakdown, item.cost_estimation_id]);

  if (!item.has_cost_breakdown) {
    return (
      <Badge variant="outline" className="text-xs flex-shrink-0 bg-slate-50 text-slate-500 border-slate-300">
        <AlertCircle className="h-3 w-3 mr-1" />
        {language === 'ar' ? 'لا يوجد تحليل' : 'No CBD'}
      </Badge>
    );
  }

  if (loading) {
    return (
      <Badge variant="outline" className="text-xs flex-shrink-0">
        {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
      </Badge>
    );
  }

  const status = estimation?.status || 'draft';
  const statusConfig = {
    draft: { 
      icon: Clock, 
      color: 'bg-slate-100 text-slate-700 border-slate-300', 
      label_ar: 'مسودة', 
      label_en: 'Draft' 
    },
    submitted: { 
      icon: Send, 
      color: 'bg-amber-100 text-amber-700 border-amber-300', 
      label_ar: 'قيد المراجعة', 
      label_en: 'Under Review' 
    },
    approved: { 
      icon: CheckCircle2, 
      color: 'bg-emerald-100 text-emerald-700 border-emerald-300', 
      label_ar: '✓ معتمد', 
      label_en: '✓ Approved' 
    },
    rejected: { 
      icon: AlertCircle, 
      color: 'bg-red-100 text-red-700 border-red-300', 
      label_ar: 'مرفوض', 
      label_en: 'Rejected' 
    },
  };

  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn("text-xs flex-shrink-0", config.color)}
    >
      <Icon className="h-3 w-3 mr-1" />
      {language === 'ar' ? config.label_ar : config.label_en}
    </Badge>
  );
}

export default function BOQInlineEditor({
  item,
  depth = 0,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onUpdate,
  onDelete,
  onAddChild,
  onMoveUp,
  onMoveDown,
  onOpenCostBreakdown,
  canMoveUp,
  canMoveDown,
  isRTL,
  language,
}) {
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);

  const hasChildren = item.children && item.children.length > 0;
  
  const levelColors = {
    1: 'text-red-600',
    2: 'text-amber-600',
    3: 'text-green-600'
  };
  
  const levelIcons = {
    1: '🔴',
    2: '🟡',
    3: '🟢'
  };

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const startEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue?.toString() || '');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = () => {
    if (!editingField) return;

    let value = editValue;
    if (['quantity', 'unit_price'].includes(editingField)) {
      value = parseFloat(editValue) || 0;
    }

    // Calculate total if quantity or unit_price changed
    const updates = { [editingField]: value };
    if (editingField === 'quantity' || editingField === 'unit_price') {
      const qty = editingField === 'quantity' ? value : (item.quantity || 0);
      const price = editingField === 'unit_price' ? value : (item.unit_price || 0);
      updates.total_amount = qty * price;
    }

    onUpdate(item.id, updates);
    setEditingField(null);
    setEditValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveEdit();
      // Move to next field
      const fields = item.level === 3 ? ['external_code', 'item_description', 'uom', 'quantity', 'unit_price'] : ['external_code', 'item_description'];
      const currentIndex = fields.indexOf(editingField);
      if (currentIndex < fields.length - 1) {
        const nextField = fields[currentIndex + 1];
        setTimeout(() => startEdit(nextField, item[nextField]), 0);
      }
    }
  };

  const renderEditableCell = (field, value, placeholder, width = 'auto', type = 'text') => {
    if (editingField === field) {
      return (
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveEdit}
            className={cn("h-7 text-sm", type === 'number' && "text-right")}
            style={{ width }}
          />
        </div>
      );
    }

    return (
      <div
        className={cn(
          "cursor-pointer hover:bg-slate-100 rounded px-1 py-0.5 min-h-[28px] flex items-center",
          !value && "text-slate-400"
        )}
        onDoubleClick={() => startEdit(field, value)}
      >
        {value || placeholder || '-'}
      </div>
    );
  };

  // Memoized subtotal - prevents recalculation on every render for 500+ line BOQs
  const subtotal = useMemo(() => {
    if (item.level === 3) {
      return (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    }
    // Level 1/2: aggregate from children with memoized rollup
    if (!item.children || item.children.length === 0) return 0;
    return item.children.reduce((sum, child) => {
      const childTotal = child.level === 3
        ? (parseFloat(child.quantity) || 0) * (parseFloat(child.unit_price) || 0)
        : (parseFloat(child.total_amount) || 0);
      return sum + childTotal;
    }, 0);
  }, [item.level, item.quantity, item.unit_price, item.children]);

  return (
    <tr className={cn(
      "border-b hover:bg-slate-50 transition-colors",
      item.level === 1 && "bg-slate-100 font-semibold",
      item.level === 2 && "bg-slate-50",
      isSelected && "bg-blue-50"
    )}>
      {/* Checkbox */}
      <td className="p-2 w-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(item.id)}
        />
      </td>
      
      {/* Code */}
      <td className="p-2 w-32">
        <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
          {hasChildren && (
            <button 
              onClick={() => onToggleExpand(item.id)} 
              className="p-0.5 hover:bg-slate-200 rounded"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          {!hasChildren && item.level < 3 && <span className="w-5" />}
          <span className={levelColors[item.level]}>
            {renderEditableCell('external_code', item.external_code || item.system_code, 'Code', '80px')}
          </span>
        </div>
      </td>
      
      {/* Description */}
      <td className="p-2">
        <div style={{ paddingRight: isRTL ? 0 : depth * 20, paddingLeft: isRTL ? depth * 20 : 0 }}>
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0">{levelIcons[item.level]}</span>
            <div className="flex-1 min-w-0">
              {renderEditableCell('item_description', item.item_description, language === 'ar' ? 'أدخل الوصف...' : 'Enter description...', '100%')}
            </div>
            {/* Cost Breakdown Status Indicator */}
            <CostBreakdownStatusBadge item={item} language={language} />
          </div>
        </div>
      </td>
      
      {/* UOM */}
      <td className="p-2 w-20 text-center">
        {item.level === 3 
          ? renderEditableCell('uom', item.uom, 'م²', '60px')
          : '-'
        }
      </td>
      
      {/* Quantity */}
      <td className="p-2 w-28 text-center">
        {item.level === 3 
          ? renderEditableCell('quantity', item.quantity, '0', '80px', 'number')
          : '-'
        }
      </td>
      
      {/* Unit Price */}
      <td className="p-2 w-32 text-center">
        {item.level === 3 ? (
          <span className={item.unit_price < 0 ? 'text-red-600' : ''}>
            {renderEditableCell('unit_price', item.unit_price, '0', '90px', 'number')}
          </span>
        ) : '-'}
      </td>
      
      {/* Total */}
      <td className="p-2 w-36 text-center font-medium">
        {item.level === 3 ? (
          <span className={subtotal < 0 ? 'text-red-600' : ''}>
            {formatNumber(subtotal, 2)}
          </span>
        ) : '-'}
      </td>
      
      {/* Actions */}
      <td className="p-2 w-40">
        <div className={cn("flex items-center gap-0.5", isRTL && "flex-row-reverse")}>
          {item.level === 3 && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              title={language === 'ar' ? 'تحليل التكلفة' : 'Cost Breakdown'}
              onClick={() => onOpenCostBreakdown(item)}
            >
              <Wallet className="h-4 w-4 text-blue-600" />
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
          
          {item.level < 3 && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => onAddChild(item.level + 1, item)}
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
              <DropdownMenuItem onClick={() => onMoveUp(item)} disabled={!canMoveUp}>
                <ArrowUp className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'نقل لأعلى' : 'Move Up'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMoveDown(item)} disabled={!canMoveDown}>
                <ArrowDown className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'نقل لأسفل' : 'Move Down'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'نسخ' : 'Copy'}
              </DropdownMenuItem>
              {item.level === 3 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
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
  );
}