import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from './LanguageContext';
import { cn } from "@/lib/utils";
import { Loader2 } from 'lucide-react';

export default function FormModal({
  open,
  onClose,
  title,
  children,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
  saveLabel,
  deleteLabel,
  showDelete = false,
  size = 'md',
  footer,
}) {
  const { t, isRTL, dir } = useLanguage();

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          sizeClasses[size],
          "max-h-[90vh] overflow-y-auto"
        )}
        dir={dir}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {children}
        </div>
        
        {footer ? footer : (
          <DialogFooter className={cn(
            "flex gap-2",
            isRTL ? "flex-row-reverse" : "flex-row",
            showDelete && "justify-between"
          )}>
            {showDelete && onDelete && (
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={isDeleting || isSaving}
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {deleteLabel || t('delete')}
              </Button>
            )}
            <div className={cn(
              "flex gap-2",
              isRTL && "flex-row-reverse"
            )}>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSaving || isDeleting}
              >
                {t('cancel')}
              </Button>
              {onSave && (
                <Button
                  onClick={onSave}
                  disabled={isSaving || isDeleting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {saveLabel || t('save')}
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}