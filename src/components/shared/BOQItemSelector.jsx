import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { formatNumber } from '@/components/shared/formatters';
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Package, Wrench, Users, Truck, FileText, Plus } from 'lucide-react';

const costTypeIcons = {
  material: Package,
  equipment: Truck,
  labor: Users,
  subcontractor: Wrench,
  service: FileText,
  indirect: FileText,
};

const costTypeColors = {
  material: 'bg-blue-100 text-blue-700',
  equipment: 'bg-amber-100 text-amber-700',
  labor: 'bg-green-100 text-green-700',
  subcontractor: 'bg-purple-100 text-purple-700',
  service: 'bg-pink-100 text-pink-700',
  indirect: 'bg-slate-100 text-slate-700',
};

export default function BOQItemSelector({
  projectId,
  selectedBOQId,
  onBOQChange,
  onRecommendationSelect,
  filterCostTypes = ['material', 'equipment', 'labor', 'subcontractor', 'service'],
  showRecommendations = true,
  className,
}) {
  const { language, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch BOQ items for the project (up to 2000)
  const { data: boqItems = [] } = useQuery({
    queryKey: ['projectBOQ', projectId],
    queryFn: () => projectId 
      ? base44.entities.ProjectBOQ.filter({ project_id: projectId }, null, 2000) 
      : Promise.resolve([]),
    enabled: !!projectId,
  });

  // Fetch cost estimations
  const { data: costEstimations = [] } = useQuery({
    queryKey: ['costEstimations', projectId],
    queryFn: () => projectId 
      ? base44.entities.CostEstimation.filter({ project_id: projectId }) 
      : Promise.resolve([]),
    enabled: !!projectId,
  });

  // Fetch cost estimation details for selected BOQ
  const selectedBOQ = boqItems.find(b => b.id === selectedBOQId);
  const relatedEstimation = costEstimations.find(e => e.boq_id === selectedBOQId);

  const { data: costDetails = [] } = useQuery({
    queryKey: ['costEstimationDetails', relatedEstimation?.id],
    queryFn: () => relatedEstimation 
      ? base44.entities.CostEstimationDetail.filter({ estimation_id: relatedEstimation.id }) 
      : Promise.resolve([]),
    enabled: !!relatedEstimation?.id,
  });

  // Fetch products and equipment for recommendations
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  // Filter cost details by type
  const filteredCostDetails = costDetails.filter(cd => 
    filterCostTypes.includes(cd.cost_element_type)
  );

  // Group cost details by type
  const groupedCostDetails = filteredCostDetails.reduce((acc, detail) => {
    const type = detail.cost_element_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(detail);
    return acc;
  }, {});

  // Build hierarchical BOQ for dropdown
  const level3Items = boqItems.filter(item => item.level === 3);
  const boqOptionsWithParents = level3Items.map(item => {
    const parent = boqItems.find(p => p.id === item.parent_boq_id);
    const grandParent = parent ? boqItems.find(gp => gp.id === parent.parent_boq_id) : null;
    
    let path = '';
    if (grandParent) path += (grandParent.external_code || grandParent.system_code) + ' > ';
    if (parent) path += (parent.external_code || parent.system_code) + ' > ';
    path += item.external_code || item.system_code;
    
    return {
      ...item,
      displayPath: path,
      parentName: parent?.item_description || '',
    };
  });

  const handleAddRecommendation = (detail) => {
    if (onRecommendationSelect) {
      // Find the related product or equipment
      let resource = null;
      if (detail.cost_element_type === 'material' && detail.resource_id) {
        resource = products.find(p => p.id === detail.resource_id);
      } else if (detail.cost_element_type === 'equipment' && detail.resource_id) {
        resource = equipment.find(e => e.id === detail.resource_id);
      }

      onRecommendationSelect({
        type: detail.cost_element_type,
        resource_id: detail.resource_id,
        resource,
        description_ar: detail.description_ar,
        description_en: detail.description_en,
        quantity: detail.quantity_per_unit,
        uom_ar: detail.uom_ar,
        uom_en: detail.uom_en,
        unit_cost: detail.unit_cost,
        boq_id: selectedBOQId,
        boq_item: selectedBOQ,
      });
    }
  };

  const typeLabels = {
    material: { ar: 'مواد', en: 'Materials' },
    equipment: { ar: 'معدات', en: 'Equipment' },
    labor: { ar: 'عمالة', en: 'Labor' },
    subcontractor: { ar: 'مقاول باطن', en: 'Subcontractor' },
    service: { ar: 'خدمات', en: 'Services' },
    indirect: { ar: 'تكاليف غير مباشرة', en: 'Indirect Costs' },
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* BOQ Item Selector */}
      <div className="space-y-2">
        <Label>
          {language === 'ar' ? 'بند جدول الكميات (اختياري)' : 'BOQ Item (Optional)'}
        </Label>
        <Select value={selectedBOQId || ''} onValueChange={onBOQChange}>
          <SelectTrigger>
            <SelectValue placeholder={language === 'ar' ? 'اختر بند من جدول الكميات' : 'Select BOQ Item'} />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value={null}>
              {language === 'ar' ? '-- بدون بند محدد --' : '-- No specific item --'}
            </SelectItem>
            {boqOptionsWithParents.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500">{item.displayPath}</span>
                  <span className="truncate max-w-md">{item.item_description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected BOQ Info */}
      {selectedBOQ && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className={cn("flex items-start gap-3", isRTL && "flex-row-reverse")}>
              <Badge className="bg-green-100 text-green-700">🟢 L3</Badge>
              <div className="flex-1">
                <p className="font-medium text-sm">{selectedBOQ.item_description}</p>
                <p className="text-xs text-slate-600">
                  {language === 'ar' ? 'الكمية:' : 'Qty:'} {formatNumber(selectedBOQ.quantity, 2)} {selectedBOQ.uom}
                  {' | '}
                  {language === 'ar' ? 'السعر:' : 'Price:'} {formatNumber(selectedBOQ.unit_price, 2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations from Cost Breakdown */}
      {showRecommendations && selectedBOQId && filteredCostDetails.length > 0 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                {language === 'ar' ? 'توصيات من تحليل التكلفة' : 'Recommendations from Cost Breakdown'}
                <Badge variant="secondary">{filteredCostDetails.length}</Badge>
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card>
              <CardContent className="p-4 space-y-4">
                {Object.entries(groupedCostDetails).map(([type, details]) => {
                  const Icon = costTypeIcons[type] || FileText;
                  return (
                    <div key={type} className="space-y-2">
                      <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <Icon className="h-4 w-4" />
                        <span className="font-medium text-sm">
                          {typeLabels[type]?.[language] || type}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {details.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 ml-6">
                        {details.map((detail, idx) => (
                          <div 
                            key={idx} 
                            className={cn(
                              "flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors",
                              isRTL && "flex-row-reverse"
                            )}
                          >
                            <div className="flex-1">
                              <p className="text-sm">
                                {language === 'ar' ? detail.description_ar : detail.description_en}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatNumber(detail.quantity_per_unit, 2)} {language === 'ar' ? detail.uom_ar : detail.uom_en}
                                {' × '}
                                {formatNumber(detail.unit_cost, 2)}
                                {' = '}
                                {formatNumber(detail.total_per_unit, 2)}
                              </p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleAddRecommendation(detail)}
                              className="h-8"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              {language === 'ar' ? 'إضافة' : 'Add'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* No recommendations message */}
      {showRecommendations && selectedBOQId && filteredCostDetails.length === 0 && selectedBOQ?.has_cost_breakdown && (
        <p className="text-sm text-slate-500 text-center py-2">
          {language === 'ar' ? 'لا يوجد تحليل تكلفة لهذا البند' : 'No cost breakdown for this item'}
        </p>
      )}
    </div>
  );
}