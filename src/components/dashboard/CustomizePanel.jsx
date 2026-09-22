import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { WIDGET_CATALOG, TABS } from './widgetCatalog';
import { toast } from 'sonner';

export default function CustomizePanel({ open, onClose, selectedIds, settingsId, userId, language }) {
  const [selected, setSelected] = useState(selectedIds || []);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) setSelected(selectedIds || []);
  }, [selectedIds, open]);

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = { dashboard_widgets: JSON.stringify(selected) };
      if (settingsId) {
        return base44.entities.AppSettings.update(settingsId, payload);
      }
      return base44.entities.AppSettings.create({ user_id: userId, ...payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      toast.success(language === 'ar' ? 'تم حفظ تخصيص اللوحة' : 'Dashboard customized');
      onClose();
    },
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{language === 'ar' ? 'تخصيص لوحة التحكم' : 'Customize Dashboard'}</SheetTitle>
        </SheetHeader>
        <p className="text-[12px] text-slate-500 mt-1">
          {language === 'ar'
            ? 'اختر البطاقات لعرضها في صفحتي الرئيسية'
            : 'Select the cards to display on My Home'}
        </p>

        <div className="mt-4 space-y-5">
          {TABS.filter((t) => t.id !== 'home').map((tab) => (
            <div key={tab.id}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                {language === 'ar' ? tab.labelAr : tab.labelEn}
              </p>
              <div className="space-y-1">
                {WIDGET_CATALOG.filter((w) => w.category === tab.id).map((w) => (
                  <label
                    key={w.id}
                    className="flex items-center gap-2.5 py-1.5 cursor-pointer hover:bg-slate-50 rounded px-1"
                  >
                    <Checkbox
                      checked={selected.includes(w.id)}
                      onCheckedChange={() => toggle(w.id)}
                    />
                    <w.icon className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[13px] text-slate-700">
                      {language === 'ar' ? w.titleAr : w.titleEn}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending
              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
              : (language === 'ar' ? 'حفظ' : 'Save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}