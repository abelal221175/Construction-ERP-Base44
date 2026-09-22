import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import { formatNumber } from '@/components/shared/formatters';
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Package, HardHat, Truck, Wrench, Loader2, Send } from 'lucide-react';

const typeConfig = {
  material: { icon: Package, label_ar: 'مواد', label_en: 'Material', color: 'bg-blue-100 text-blue-700' },
  subcontractor: { icon: HardHat, label_ar: 'مقاول باطن', label_en: 'Subcontractor', color: 'bg-purple-100 text-purple-700' },
  equipment: { icon: Truck, label_ar: 'معدات', label_en: 'Equipment', color: 'bg-emerald-100 text-emerald-700' },
  service: { icon: Wrench, label_ar: 'خدمات', label_en: 'Service', color: 'bg-pink-100 text-pink-700' },
};

export default function RFQFromCostBreakdownModal({ 
  open, 
  onClose, 
  boqItem, 
  estimation, 
  details = [],
  projectId 
}) {
  const { language, isRTL, dir } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const [selectedItems, setSelectedItems] = useState([]);
  const [rfqDate, setRfqDate] = useState(new Date().toISOString().split('T')[0]);
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');

  // Get eligible items (material, subcontractor, equipment, service)
  const eligibleTypes = ['material', 'subcontractor', 'equipment', 'service'];
  const eligibleItems = details.filter(d => eligibleTypes.includes(d.cost_element_type));

  // Fetch numbering series for RFQ
  const { data: numberingSeries = [] } = useQuery({
    queryKey: ['numberingSeries', currentCompany?.id, 'RFQ'],
    queryFn: async () => {
      const series = await base44.entities.NumberingSeries.filter({
        company_id: currentCompany?.id,
        document_type: 'RFQ'
      });
      return series;
    },
    enabled: !!currentCompany?.id,
  });

  const toggleItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAll = () => {
    if (selectedItems.length === eligibleItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(eligibleItems.map(i => i.id));
    }
  };

  const createRFQMutation = useMutation({
    mutationFn: async () => {
      // Generate RFQ number
      let rfqNumber = `RFQ-${Date.now()}`;
      if (numberingSeries.length > 0) {
        const series = numberingSeries[0];
        const nextNum = (series.current_number || 0) + 1;
        rfqNumber = `${series.prefix || 'RFQ'}${String(nextNum).padStart(series.padding || 4, '0')}`;
        await base44.entities.NumberingSeries.update(series.id, { current_number: nextNum });
      }

      // Create RFQ
      const rfq = await base44.entities.RFQ.create({
        company_id: currentCompany?.id,
        rfq_number: rfqNumber,
        rfq_date: rfqDate,
        project_id: projectId,
        response_deadline: deadline || null,
        status: 'draft',
        notes: notes,
      });

      // Create RFQ Items from selected cost breakdown details
      const selectedDetails = details.filter(d => selectedItems.includes(d.id));
      
      for (const detail of selectedDetails) {
        await base44.entities.RFQItem.create({
          rfq_id: rfq.id,
          boq_id: boqItem.id,
          estimation_id: estimation?.id,
          cost_element_type: detail.cost_element_type,
          cost_element_id: detail.id,
          item_description: language === 'ar' ? detail.description_ar : detail.description_en || detail.description_ar,
          specifications: detail.specifications || '',
          quantity: (detail.quantity_per_unit || 1) * (boqItem.quantity || 1),
          uom: language === 'ar' ? detail.uom_ar : detail.uom_en || detail.uom_ar,
          estimated_unit_price: detail.unit_cost,
        });
      }

      // Update cost estimation details with RFQ link
      for (const detail of selectedDetails) {
        if (!detail.id.startsWith('new_') && !detail.id.startsWith('template_')) {
          await base44.entities.CostEstimationDetail.update(detail.id, {
            rfq_id: rfq.id
          });
        }
      }

      return rfq;
    },
    onSuccess: (rfq) => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      queryClient.invalidateQueries({ queryKey: ['rfqItems'] });
      queryClient.invalidateQueries({ queryKey: ['costEstimationDetails'] });
      toast.success(language === 'ar' ? `تم إنشاء طلب عرض السعر ${rfq.rfq_number}` : `RFQ ${rfq.rfq_number} created`);
      onClose();
    },
    onError: (error) => {
      toast.error(language === 'ar' ? 'خطأ في إنشاء الطلب' : 'Error creating RFQ');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" dir={dir}>
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'إنشاء طلب عرض سعر' : 'Create RFQ'}
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            {language === 'ar' 
              ? `من تحليل التكلفة: ${boqItem.item_description}` 
              : `From Cost Breakdown: ${boqItem.item_description}`}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* RFQ Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'تاريخ الطلب' : 'RFQ Date'}</Label>
              <Input 
                type="date" 
                value={rfqDate} 
                onChange={(e) => setRfqDate(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'آخر موعد للرد' : 'Response Deadline'}</Label>
              <Input 
                type="date" 
                value={deadline} 
                onChange={(e) => setDeadline(e.target.value)} 
              />
            </div>
          </div>

          {/* Item Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{language === 'ar' ? 'اختر البنود' : 'Select Items'}</Label>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedItems.length === eligibleItems.length 
                  ? (language === 'ar' ? 'إلغاء الكل' : 'Deselect All')
                  : (language === 'ar' ? 'تحديد الكل' : 'Select All')}
              </Button>
            </div>
            
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {eligibleItems.length === 0 ? (
                <div className="p-4 text-center text-slate-500">
                  {language === 'ar' ? 'لا توجد بنود قابلة للتسعير' : 'No items available for RFQ'}
                </div>
              ) : (
                eligibleItems.map(item => {
                  const config = typeConfig[item.cost_element_type];
                  const Icon = config?.icon || Package;
                  const isSelected = selectedItems.includes(item.id);
                  
                  return (
                    <div 
                      key={item.id} 
                      className={cn(
                        "flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors",
                        isSelected && "bg-blue-50",
                        isRTL && "flex-row-reverse"
                      )}
                      onClick={() => toggleItem(item.id)}
                    >
                      <Checkbox checked={isSelected} />
                      <div className={cn("p-1.5 rounded", config?.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {language === 'ar' ? item.description_ar : item.description_en || item.description_ar}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatNumber(item.quantity_per_unit, 2)} × {formatNumber(item.unit_cost, 2)} = {formatNumber(item.total_per_unit, 2)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {language === 'ar' ? config?.label_ar : config?.label_en}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
              rows={2}
            />
          </div>

          {/* Summary */}
          {selectedItems.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-700">
                {language === 'ar' 
                  ? `سيتم إنشاء طلب عرض سعر يحتوي على ${selectedItems.length} بند`
                  : `RFQ will be created with ${selectedItems.length} item(s)`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className={cn("pt-4 border-t", isRTL && "flex-row-reverse")}>
          <Button variant="outline" onClick={onClose}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button 
            onClick={() => createRFQMutation.mutate()}
            disabled={createRFQMutation.isPending || selectedItems.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createRFQMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            <Send className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'إنشاء الطلب' : 'Create RFQ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}