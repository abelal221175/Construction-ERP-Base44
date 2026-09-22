import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { formatNumber, formatDate } from '@/components/shared/formatters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FileCheck, Loader2, ArrowRight, Check, AlertTriangle } from 'lucide-react';

export default function UpdatePricesFromQuotationModal({ 
  open, 
  onClose, 
  estimation,
  details = [],
  onUpdated 
}) {
  const { language, isRTL, dir } = useLanguage();
  const queryClient = useQueryClient();

  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [priceUpdates, setPriceUpdates] = useState({});

  // Fetch RFQs linked to this estimation
  const { data: linkedRFQs = [] } = useQuery({
    queryKey: ['linkedRFQs', estimation?.id],
    queryFn: async () => {
      if (!estimation) return [];
      // Get RFQ items linked to this estimation
      const rfqItems = await base44.entities.RFQItem.filter({ estimation_id: estimation.id });
      const rfqIds = [...new Set(rfqItems.map(i => i.rfq_id))];
      if (rfqIds.length === 0) return [];
      
      // Fetch RFQs
      const rfqs = await base44.entities.RFQ.list();
      return rfqs.filter(r => rfqIds.includes(r.id) && (r.status === 'received' || r.status === 'evaluated'));
    },
    enabled: !!estimation,
  });

  // Fetch quotations for selected RFQ
  const { data: quotations = [] } = useQuery({
    queryKey: ['quotations', selectedRFQ],
    queryFn: async () => {
      if (!selectedRFQ) return [];
      const quotes = await base44.entities.VendorQuotation.filter({ rfq_id: selectedRFQ });
      return quotes;
    },
    enabled: !!selectedRFQ,
  });

  // Fetch RFQ items for matching
  const { data: rfqItems = [] } = useQuery({
    queryKey: ['rfqItems', selectedRFQ],
    queryFn: async () => {
      if (!selectedRFQ) return [];
      return base44.entities.RFQItem.filter({ rfq_id: selectedRFQ });
    },
    enabled: !!selectedRFQ,
  });

  // Calculate price differences when quotation is selected
  useEffect(() => {
    if (!selectedQuotation || rfqItems.length === 0) {
      setPriceUpdates({});
      return;
    }

    const updates = {};
    rfqItems.forEach(rfqItem => {
      // Find matching cost detail
      const costDetail = details.find(d => d.id === rfqItem.cost_element_id);
      if (costDetail && rfqItem.quoted_unit_price) {
        updates[costDetail.id] = {
          rfqItemId: rfqItem.id,
          currentPrice: costDetail.unit_cost,
          quotedPrice: rfqItem.quoted_unit_price,
          difference: rfqItem.quoted_unit_price - costDetail.unit_cost,
          percentChange: costDetail.unit_cost > 0 
            ? ((rfqItem.quoted_unit_price - costDetail.unit_cost) / costDetail.unit_cost) * 100 
            : 0,
          description: language === 'ar' ? costDetail.description_ar : costDetail.description_en,
        };
      }
    });
    setPriceUpdates(updates);
    setSelectedItems(Object.keys(updates));
  }, [selectedQuotation, rfqItems, details, language]);

  const toggleItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const updatePricesMutation = useMutation({
    mutationFn: async () => {
      const updates = selectedItems.map(async (detailId) => {
        const update = priceUpdates[detailId];
        if (!update) return;

        // Update cost estimation detail
        await base44.entities.CostEstimationDetail.update(detailId, {
          unit_cost: update.quotedPrice,
          total_per_unit: (details.find(d => d.id === detailId)?.quantity_per_unit || 1) * update.quotedPrice,
          quoted_price: update.quotedPrice,
          quotation_id: selectedQuotation,
        });

        // Update RFQ item as selected
        await base44.entities.RFQItem.update(update.rfqItemId, {
          selected_vendor_id: quotations.find(q => q.id === selectedQuotation)?.vendor_id,
        });
      });

      await Promise.all(updates);

      // Recalculate estimation totals
      const allDetails = await base44.entities.CostEstimationDetail.filter({ estimation_id: estimation.id });
      const totals = {
        material_cost: allDetails.filter(d => d.cost_element_type === 'material').reduce((s, d) => s + (d.total_per_unit || 0), 0),
        subcontractor_cost: allDetails.filter(d => d.cost_element_type === 'subcontractor').reduce((s, d) => s + (d.total_per_unit || 0), 0),
        labor_cost: allDetails.filter(d => d.cost_element_type === 'labor').reduce((s, d) => s + (d.total_per_unit || 0), 0),
        equipment_cost: allDetails.filter(d => d.cost_element_type === 'equipment').reduce((s, d) => s + (d.total_per_unit || 0), 0),
        services_cost: allDetails.filter(d => d.cost_element_type === 'service').reduce((s, d) => s + (d.total_per_unit || 0), 0),
        indirect_cost: allDetails.filter(d => d.cost_element_type === 'indirect').reduce((s, d) => s + (d.total_per_unit || 0), 0),
      };
      const dryCost = Object.values(totals).reduce((s, v) => s + v, 0);

      await base44.entities.CostEstimation.update(estimation.id, {
        ...totals,
        dry_cost_per_unit: dryCost,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costEstimationDetails'] });
      queryClient.invalidateQueries({ queryKey: ['costEstimations'] });
      toast.success(language === 'ar' ? 'تم تحديث الأسعار بنجاح' : 'Prices updated successfully');
      if (onUpdated) onUpdated();
      onClose();
    },
    onError: () => {
      toast.error(language === 'ar' ? 'خطأ في تحديث الأسعار' : 'Error updating prices');
    }
  });

  const hasUpdates = Object.keys(priceUpdates).length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-blue-600" />
            {language === 'ar' ? 'تحديث الأسعار من عروض الأسعار' : 'Update Prices from Quotations'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {linkedRFQs.length === 0 ? (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <p className="text-sm text-amber-700">
                  {language === 'ar' 
                    ? 'لا توجد طلبات عروض أسعار مرتبطة بهذا التحليل'
                    : 'No RFQs linked to this estimation'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* RFQ Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'اختر طلب عرض السعر' : 'Select RFQ'}
                </label>
                <Select value={selectedRFQ || ''} onValueChange={setSelectedRFQ}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر...' : 'Select...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {linkedRFQs.map(rfq => (
                      <SelectItem key={rfq.id} value={rfq.id}>
                        <span className="font-mono">{rfq.rfq_number}</span>
                        <span className="text-slate-500 ml-2">({formatDate(rfq.rfq_date)})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quotation Selection */}
              {selectedRFQ && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {language === 'ar' ? 'اختر عرض السعر' : 'Select Quotation'}
                  </label>
                  {quotations.length === 0 ? (
                    <p className="text-sm text-slate-500 p-2 bg-slate-50 rounded">
                      {language === 'ar' ? 'لا توجد عروض أسعار لهذا الطلب' : 'No quotations for this RFQ'}
                    </p>
                  ) : (
                    <Select value={selectedQuotation || ''} onValueChange={setSelectedQuotation}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر عرض السعر...' : 'Select quotation...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {quotations.map(q => (
                          <SelectItem key={q.id} value={q.id}>
                            <span className="font-mono">{q.quotation_number}</span>
                            <span className="text-slate-500 ml-2">({formatDate(q.quotation_date)})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Price Updates Preview */}
              {hasUpdates && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {language === 'ar' ? 'تحديثات الأسعار' : 'Price Updates'}
                  </label>
                  <div className="border rounded-lg divide-y">
                    {Object.entries(priceUpdates).map(([detailId, update]) => {
                      const isSelected = selectedItems.includes(detailId);
                      const isIncrease = update.difference > 0;
                      
                      return (
                        <div 
                          key={detailId}
                          className={cn(
                            "flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50",
                            isSelected && "bg-blue-50",
                            isRTL && "flex-row-reverse"
                          )}
                          onClick={() => toggleItem(detailId)}
                        >
                          <Checkbox checked={isSelected} />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{update.description}</p>
                            <div className={cn("flex items-center gap-2 text-sm mt-1", isRTL && "flex-row-reverse")}>
                              <span className="text-slate-500">{formatNumber(update.currentPrice, 2)}</span>
                              <ArrowRight className="h-4 w-4 text-slate-400" />
                              <span className="font-semibold">{formatNumber(update.quotedPrice, 2)}</span>
                            </div>
                          </div>
                          <Badge className={cn(
                            "text-xs",
                            isIncrease ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {isIncrease ? '+' : ''}{formatNumber(update.percentChange, 1)}%
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className={cn("pt-4 border-t", isRTL && "flex-row-reverse")}>
          <Button variant="outline" onClick={onClose}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button 
            onClick={() => updatePricesMutation.mutate()}
            disabled={updatePricesMutation.isPending || selectedItems.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {updatePricesMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            <Check className="h-4 w-4 mr-1" />
            {language === 'ar' ? `تحديث ${selectedItems.length} سعر` : `Update ${selectedItems.length} Price(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}