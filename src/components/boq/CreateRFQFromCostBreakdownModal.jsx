import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import { formatNumber, getLocalizedName } from '@/components/shared/formatters';
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Send, 
  Loader2,
  Package,
  HardHat,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function CreateRFQFromCostBreakdownModal({ open, onClose, boqItem, costDetails }) {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const [selectedItems, setSelectedItems] = useState([]);
  const [rfqNumber, setRfqNumber] = useState('');
  const [dueDate, setDueDate] = useState('');

  const { data: businessPartners = [] } = useQuery({
    queryKey: ['businessPartners', currentCompany?.id],
    queryFn: () => base44.entities.BusinessPartner.filter({ 
      company_id: currentCompany?.id, 
      is_active: true,
    }),
    enabled: !!currentCompany?.id,
  });

  const suppliers = businessPartners.filter(bp => bp.is_supplier || bp.is_subcontractor);

  // Filter items that can be in RFQ (materials and subcontractor)
  const rfqEligibleItems = costDetails?.filter(item => 
    item.cost_element_type === 'material' || item.cost_element_type === 'subcontractor'
  ) || [];

  // Initialize selection
  React.useEffect(() => {
    if (open && rfqEligibleItems.length > 0) {
      setSelectedItems(rfqEligibleItems.map(item => item._key || item.id));
      // Generate RFQ number
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      setRfqNumber(`RFQ-${dateStr}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`);
    }
  }, [open]);

  const toggleItemSelection = (itemKey) => {
    setSelectedItems(prev => 
      prev.includes(itemKey) 
        ? prev.filter(k => k !== itemKey)
        : [...prev, itemKey]
    );
  };

  const createRFQMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      
      // Create RFQ header
      const rfq = await base44.entities.RFQ.create({
        company_id: currentCompany?.id,
        project_id: boqItem.project_id,
        rfq_number: rfqNumber,
        rfq_date: new Date().toISOString().split('T')[0],
        due_date: dueDate,
        status: 'draft',
        rfq_type: 'procurement',
        source_document: 'BOQ',
        source_document_id: boqItem.id,
        created_by: user.email,
      });

      // Create RFQ items
      const selectedDetails = rfqEligibleItems.filter(item => 
        selectedItems.includes(item._key || item.id)
      );

      for (let i = 0; i < selectedDetails.length; i++) {
        const item = selectedDetails[i];
        await base44.entities.RFQItem.create({
          rfq_id: rfq.id,
          line_no: i + 1,
          item_type: item.cost_element_type,
          product_id: item.cost_element_type === 'material' ? item.resource_id : null,
          description_ar: item.description_ar,
          description_en: item.description_en,
          quantity: item.quantity_per_unit * (boqItem.quantity || 1),
          uom_ar: item.uom_ar,
          uom_en: item.uom_en,
          estimated_unit_price: item.unit_cost,
        });
      }

      return rfq;
    },
    onSuccess: (rfq) => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      toast.success(language === 'ar' 
        ? `تم إنشاء RFQ ${rfq.rfq_number}` 
        : `RFQ ${rfq.rfq_number} created`
      );
      onClose();
    },
    onError: (error) => {
      toast.error(language === 'ar' ? 'خطأ في إنشاء RFQ' : 'Error creating RFQ');
      console.error(error);
    },
  });

  const handleCreate = () => {
    if (selectedItems.length === 0) {
      toast.error(language === 'ar' ? 'يرجى تحديد بنود' : 'Please select items');
      return;
    }
    if (!rfqNumber.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال رقم RFQ' : 'Please enter RFQ number');
      return;
    }
    createRFQMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {language === 'ar' ? 'إنشاء طلب عرض سعر (RFQ)' : 'Create RFQ'}
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            {language === 'ar' ? 'من تحليل التكلفة:' : 'From Cost Breakdown:'} {boqItem?.brief_description || boqItem?.item_description}
          </p>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* RFQ Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{language === 'ar' ? 'رقم RFQ' : 'RFQ Number'}</Label>
              <Input
                value={rfqNumber}
                onChange={(e) => setRfqNumber(e.target.value)}
                placeholder="RFQ-XXXXXXX"
                className="mt-1"
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Items Selection */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <Label className="mb-2">
              {language === 'ar' ? 'البنود المختارة' : 'Select Items'}
              <span className="text-sm text-slate-500 ml-2">
                ({selectedItems.length} {language === 'ar' ? 'من' : 'of'} {rfqEligibleItems.length})
              </span>
            </Label>
            
            {rfqEligibleItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Package className="h-12 w-12 mb-2" />
                <p>{language === 'ar' ? 'لا توجد بنود مؤهلة لـ RFQ' : 'No eligible items for RFQ'}</p>
                <p className="text-sm">{language === 'ar' ? '(مواد أو مقاول باطن فقط)' : '(Materials or Subcontractor only)'}</p>
              </div>
            ) : (
              <ScrollArea className="flex-1 border rounded-lg">
                <div className="p-3 space-y-2">
                  {rfqEligibleItems.map(item => {
                    const itemKey = item._key || item.id;
                    const isSelected = selectedItems.includes(itemKey);
                    const Icon = item.cost_element_type === 'material' ? Package : HardHat;
                    
                    return (
                      <div
                        key={itemKey}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          isSelected ? "bg-blue-50 border-blue-200" : "bg-white hover:bg-slate-50"
                        )}
                        onClick={() => toggleItemSelection(itemKey)}
                      >
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => toggleItemSelection(itemKey)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Icon className={cn(
                          "h-5 w-5 mt-0.5",
                          item.cost_element_type === 'material' ? 'text-blue-600' : 'text-amber-600'
                        )} />
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {language === 'ar' ? item.description_ar : item.description_en}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <Badge variant="outline" className="text-xs">
                              {item.cost_element_type === 'material' 
                                ? (language === 'ar' ? 'مواد' : 'Material')
                                : (language === 'ar' ? 'مقاول باطن' : 'Subcontractor')
                              }
                            </Badge>
                            <span>{formatNumber(item.quantity_per_unit, 4)} {language === 'ar' ? item.uom_ar : item.uom_en}</span>
                            <span>×</span>
                            <span>EGP {formatNumber(item.unit_cost, 2)}</span>
                            <span>=</span>
                            <span className="font-semibold">EGP {formatNumber(item.total_per_unit, 2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={createRFQMutation.isPending || selectedItems.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createRFQMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            <Send className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'إنشاء RFQ' : 'Create RFQ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}