import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Camera, X, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatNumber } from '@/components/shared/formatters';
import { toast } from 'sonner';

export default function QuantityEntryDialog({ open, onOpenChange, boqItem, previousCumulative = 0, previousCompletion = 0, onSave, language }) {
  const [currentQty, setCurrentQty] = useState('');
  const [method, setMethod] = useState('Area');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [location, setLocation] = useState('');
  const [completion, setCompletion] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentQty('');
      setMethod('Area');
      setLength(''); setWidth(''); setHeight('');
      setLocation('');
      setCompletion(previousCompletion || 0);
      setPhotos([]);
    }
  }, [open, boqItem?.id, previousCompletion]);

  const calcQty = () => {
    const l = parseFloat(length) || 0;
    const w = parseFloat(width) || 0;
    const h = parseFloat(height) || 0;
    if (method === 'Area') return l * w;
    if (method === 'Volume') return l * w * h;
    if (method === 'Linear') return l;
    return parseFloat(currentQty) || 0;
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotos((p) => [...p, file_url]);
    } catch {
      toast.error(language === 'ar' ? 'فشل رفع الصورة' : 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    const qty = parseFloat(currentQty) || calcQty();
    if (qty <= 0) {
      toast.error(language === 'ar' ? 'أدخل الكمية' : 'Enter quantity');
      return;
    }
    onSave({
      boq_item_id: boqItem.id,
      boq_code: boqItem.system_code || boqItem.external_code || '',
      description: boqItem.item_description || '',
      unit: boqItem.uom || '',
      previous_cumulative_quantity: previousCumulative,
      current_quantity: qty,
      cumulative_quantity: previousCumulative + qty,
      previous_completion_percentage: previousCompletion,
      current_completion_percentage: completion,
      measurement_method: method,
      measurement_details: JSON.stringify({ length, width, height }),
      location_description: location,
      measurement_photos: JSON.stringify(photos),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[14px]">
            {language === 'ar' ? 'إدخال الكميات' : 'Enter Measurements'}
          </DialogTitle>
        </DialogHeader>

        {/* BOQ info */}
        <div className="bg-slate-50 rounded-md p-3 text-[12px] space-y-1">
          <div className="font-mono text-slate-500">{boqItem?.system_code || boqItem?.external_code || ''}</div>
          <div className="text-slate-800 font-medium">{boqItem?.item_description || ''}</div>
          <div className="text-slate-500">{language === 'ar' ? 'الوحدة' : 'Unit'}: {boqItem?.uom || '-'}</div>
          <div className="pt-1 border-t border-slate-200 text-slate-500">
            {language === 'ar' ? 'التراكمي السابق' : 'Prev Cumulative'}: {formatNumber(previousCumulative, 2)} {boqItem?.uom || ''}
            {' · '}{language === 'ar' ? 'النسبة السابقة' : 'Prev %'}: {formatNumber(previousCompletion, 1)}%
          </div>
        </div>

        {/* Current quantity */}
        <div className="space-y-1.5">
          <Label className="text-[12px]">{language === 'ar' ? `الكمية الحالية (${boqItem?.uom || ''})` : `Current Quantity (${boqItem?.uom || ''})`} *</Label>
          <Input
            type="number"
            value={currentQty}
            onChange={(e) => setCurrentQty(e.target.value)}
            placeholder={calcQty() ? calcQty().toFixed(2) : '0.00'}
            className="h-9 text-[13px]"
          />
        </div>

        {/* Measurement method */}
        <div className="space-y-1.5">
          <Label className="text-[12px]">{language === 'ar' ? 'طريقة القياس' : 'Measurement Method'}</Label>
          <RadioGroup value={method} onValueChange={setMethod} className="grid grid-cols-4 gap-1.5">
            {['Linear', 'Area', 'Volume', 'Count'].map((m) => (
              <div key={m} className="flex items-center gap-1">
                <RadioGroupItem value={m} id={m} className="h-3.5 w-3.5" />
                <Label htmlFor={m} className="text-[11px]">{m}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Dimensions */}
        {method !== 'Count' && method !== 'Linear' && (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[11px]">{language === 'ar' ? 'الطول' : 'Length'}</Label>
              <Input type="number" value={length} onChange={(e) => setLength(e.target.value)} className="h-8 text-[12px]" />
            </div>
            <div>
              <Label className="text-[11px]">{language === 'ar' ? 'العرض' : 'Width'}</Label>
              <Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} className="h-8 text-[12px]" />
            </div>
            {method === 'Volume' && (
              <div>
                <Label className="text-[11px]">{language === 'ar' ? 'الارتفاع' : 'Height'}</Label>
                <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="h-8 text-[12px]" />
              </div>
            )}
          </div>
        )}
        {method !== 'Count' && calcQty() > 0 && (
          <div className="text-[11px] text-erp-accent font-mono">
            {language === 'ar' ? 'المحسوب' : 'Calculated'}: {formatNumber(calcQty(), 2)} {boqItem?.uom || ''}
          </div>
        )}

        {/* Location */}
        <div className="space-y-1.5">
          <Label className="text-[12px]">{language === 'ar' ? 'الموقع بالموقع' : 'Location on Site'}</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={language === 'ar' ? 'مثال: مبنى أ - الدور الأرضي' : 'e.g., Building A - Ground Floor'} className="h-9 text-[13px]" />
        </div>

        {/* Completion percentage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[12px]">{language === 'ar' ? 'نسبة الإنجاز' : 'Completion %'}</Label>
            <span className="font-mono text-[14px] font-semibold text-erp-accent">{completion}%</span>
          </div>
          <Slider value={[completion]} onValueChange={(v) => setCompletion(v[0])} min={0} max={100} step={5} />
          <div className="text-[10px] text-slate-400">
            {language === 'ar' ? 'النسبة السابقة' : 'Previous'}: {formatNumber(previousCompletion, 1)}%
          </div>
        </div>

        {/* Photos */}
        <div className="space-y-1.5">
          <Label className="text-[12px]">{language === 'ar' ? 'صور القياس' : 'Measurement Photos'}</Label>
          <div className="flex flex-wrap gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt="" className="h-14 w-14 rounded object-cover" />
                <button
                  onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
            <label className="h-14 w-14 rounded border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-erp-accent text-slate-400">
              {uploading ? <div className="h-4 w-4 border-2 border-slate-300 border-t-erp-accent rounded-full animate-spin" /> : <Camera className="h-5 w-5" />}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-blue-50 rounded-md p-2.5 text-[12px] space-y-0.5">
          <div className="flex justify-between text-slate-600">
            <span>{language === 'ar' ? 'تراكمي جديد' : 'New Cumulative'}</span>
            <span className="font-mono font-semibold">{formatNumber(previousCumulative + (parseFloat(currentQty) || calcQty()), 2)}</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-[12px]">
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} className="text-[12px]">
            {language === 'ar' ? 'حفظ البند' : 'Save Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}