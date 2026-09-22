import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { formatNumber, formatCurrency, getLocalizedName } from '@/components/shared/formatters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Award, TrendingDown, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function RFQComparisonModal({ open, onClose, rfq }) {
  const { t, language, isRTL } = useLanguage();
  const queryClient = useQueryClient();

  const [selectedQuotation, setSelectedQuotation] = useState(null);

  const { data: quotations = [] } = useQuery({
    queryKey: ['rfqQuotations', rfq?.id],
    queryFn: () => rfq ? base44.entities.RFQVendorQuotation.filter({ rfq_id: rfq.id }) : [],
    enabled: !!rfq,
  });

  const { data: rfqItems = [] } = useQuery({
    queryKey: ['rfqItems', rfq?.id],
    queryFn: () => rfq ? base44.entities.RFQItem.filter({ rfq_id: rfq.id }) : [],
    enabled: !!rfq,
  });

  const { data: businessPartners = [] } = useQuery({
    queryKey: ['businessPartners'],
    queryFn: () => base44.entities.BusinessPartner.list(),
  });

  const awardMutation = useMutation({
    mutationFn: async (quotationId) => {
      const user = await base44.auth.me();
      await base44.entities.RFQVendorQuotation.update(quotationId, {
        status: 'awarded',
        is_awarded: true,
        award_date: new Date().toISOString(),
        awarded_by: user.email,
      });
      await base44.entities.RFQ.update(rfq.id, { status: 'awarded' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqQuotations'] });
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      toast.success(language === 'ar' ? 'تم منح العطاء' : 'Quotation awarded');
      onClose();
    },
  });

  if (!rfq) return null;

  // Find best price
  const lowestPrice = Math.min(...quotations.map(q => q.total_amount || 0).filter(p => p > 0));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'مقارنة العروض' : 'Compare Quotations'} - {rfq.rfq_number}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[70vh] space-y-4">
          {quotations.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {language === 'ar' ? 'لا توجد عروض' : 'No quotations received'}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {quotations.map(quotation => {
                const vendor = businessPartners.find(bp => bp.id === quotation.vendor_id);
                const isBestPrice = quotation.total_amount === lowestPrice && quotation.total_amount > 0;

                return (
                  <Card 
                    key={quotation.id}
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedQuotation?.id === quotation.id && "ring-2 ring-blue-500",
                      isBestPrice && "border-emerald-500 border-2",
                      quotation.is_awarded && "bg-emerald-50"
                    )}
                    onClick={() => setSelectedQuotation(quotation)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">
                            {getLocalizedName(vendor, language, 'bp_name_ar', 'bp_name_en')}
                          </h3>
                          <p className="text-xs text-slate-500">{quotation.quotation_number}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          {isBestPrice && (
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              {language === 'ar' ? 'أفضل سعر' : 'Best Price'}
                            </Badge>
                          )}
                          {quotation.is_awarded && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              <Award className="h-3 w-3 mr-1" />
                              {language === 'ar' ? 'فائز' : 'Awarded'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">{language === 'ar' ? 'إجمالي العرض:' : 'Total Amount:'}</span>
                          <span className="font-bold font-mono">{formatCurrency(quotation.total_amount, 'EGP', 0)}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">{language === 'ar' ? 'شروط الدفع:' : 'Payment Terms:'}</span>
                          <span className="text-xs">{quotation.payment_terms || '-'}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">{language === 'ar' ? 'التسليم:' : 'Delivery:'}</span>
                          <span className="text-xs">{quotation.delivery_terms || '-'}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">{language === 'ar' ? 'صالح حتى:' : 'Valid Until:'}</span>
                          <span className="text-xs">{quotation.valid_until || '-'}</span>
                        </div>
                      </div>

                      {quotation.notes && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-slate-600">{quotation.notes}</p>
                        </div>
                      )}

                      {!quotation.is_awarded && quotation.status === 'received' && (
                        <Button
                          className="w-full mt-4"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            awardMutation.mutate(quotation.id);
                          }}
                          disabled={awardMutation.isPending}
                        >
                          {awardMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Award className="h-4 w-4 mr-1" />
                          )}
                          {language === 'ar' ? 'منح العطاء' : 'Award'}
                        </Button>
                      )}

                      {quotation.is_awarded && (
                        <div className="flex items-center justify-center gap-2 text-emerald-600 mt-4 text-sm font-medium">
                          <CheckCircle className="h-4 w-4" />
                          {language === 'ar' ? 'تم منح العطاء' : 'Awarded'}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}