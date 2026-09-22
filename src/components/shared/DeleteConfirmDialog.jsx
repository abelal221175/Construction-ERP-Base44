import React from 'react';
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
import { useLanguage } from './LanguageContext';
import { cn } from "@/lib/utils";
import { Loader2, AlertTriangle } from 'lucide-react';

export default function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  isDeleting = false,
}) {
  const { t, isRTL, dir } = useLanguage();

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent dir={dir}>
        <AlertDialogHeader>
          <div className={cn(
            "flex items-center gap-3",
            isRTL && "flex-row-reverse"
          )}>
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle>
              {title || t('confirmDelete')}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className={cn(isRTL ? "text-right" : "text-left", "mt-2")}>
            {description || t('confirmDelete')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={cn(
          isRTL && "flex-row-reverse gap-2"
        )}>
          <AlertDialogCancel disabled={isDeleting}>
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}