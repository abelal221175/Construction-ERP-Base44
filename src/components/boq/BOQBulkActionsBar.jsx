import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Copy, 
  Trash2, 
  FileText, 
  ShoppingCart, 
  Calculator,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from "@/lib/utils";

export default function BOQBulkActionsBar({ 
  selectedCount, 
  onClear,
  onDelete,
  onCreateRFQ,
  onCreatePO,
  onBulkCostBreakdown,
  onMoveUp,
  onMoveDown,
  language,
  isRTL 
}) {
  if (selectedCount === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-blue-600 text-white shadow-lg z-50 transition-transform",
      "flex items-center justify-between px-6 py-3"
    )} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-white text-blue-600">
            {selectedCount}
          </Badge>
          <span className="font-medium">
            {language === 'ar' ? 'عنصر محدد' : 'items selected'}
          </span>
        </div>
        
        <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          {language === 'ar' ? 'إلغاء التحديد' : 'Clear'}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {onMoveUp && (
          <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700" onClick={onMoveUp}>
            <ArrowUp className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'نقل لأعلى' : 'Move Up'}
          </Button>
        )}
        
        {onMoveDown && (
          <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700" onClick={onMoveDown}>
            <ArrowDown className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'نقل لأسفل' : 'Move Down'}
          </Button>
        )}
        
        {onBulkCostBreakdown && (
          <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700" onClick={onBulkCostBreakdown}>
            <Calculator className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'تحليل التكلفة' : 'Cost Breakdown'}
          </Button>
        )}
        
        {onCreateRFQ && (
          <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700" onClick={onCreateRFQ}>
            <FileText className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'إنشاء RFQ' : 'Create RFQ'}
          </Button>
        )}
        
        {onCreatePO && (
          <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700" onClick={onCreatePO}>
            <ShoppingCart className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'إنشاء أمر شراء' : 'Create PO'}
          </Button>
        )}
        
        {onDelete && (
          <Button variant="ghost" size="sm" className="text-white hover:bg-red-700 bg-red-600" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'حذف' : 'Delete'}
          </Button>
        )}
      </div>
    </div>
  );
}