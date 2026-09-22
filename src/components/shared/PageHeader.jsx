import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload, RefreshCw } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { cn } from "@/lib/utils";

export default function PageHeader({
  title,
  subtitle,
  onAdd,
  addLabel,
  onExport,
  onImport,
  onRefresh,
  actions = [],
  children
}) {
  const { t, isRTL } = useLanguage();

  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6",
      isRTL && "sm:flex-row-reverse"
    )}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
      
      <div className={cn(
        "flex items-center gap-2 flex-wrap",
        isRTL && "flex-row-reverse"
      )}>
        {children}
        
        {onRefresh && (
          <Button variant="outline" size="icon" onClick={onRefresh} className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        
        {onExport && (
          <Button variant="outline" onClick={onExport} className="h-9">
            <Download className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('export')}
          </Button>
        )}
        
        {onImport && (
          <Button variant="outline" onClick={onImport} className="h-9">
            <Upload className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('import')}
          </Button>
        )}
        
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || "outline"}
            onClick={action.onClick}
            className="h-9"
            disabled={action.disabled}
          >
            {action.icon && (
              <action.icon className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            )}
            {action.label}
          </Button>
        ))}
        
        {onAdd && (
          <Button onClick={onAdd} className="h-9 bg-blue-600 hover:bg-blue-700">
            <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {addLabel || t('add')}
          </Button>
        )}
      </div>
    </div>
  );
}