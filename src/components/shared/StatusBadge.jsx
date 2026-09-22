import React from 'react';
import { Badge } from "@/components/ui/badge";
import { getStatusColor, getPriorityColor } from './formatters';
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }) {
  if (!status) return null;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-medium capitalize border",
        getStatusColor(status),
        className
      )}
    >
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }) {
  if (!priority) return null;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-medium capitalize border",
        getPriorityColor(priority),
        className
      )}
    >
      {priority}
    </Badge>
  );
}

export function LevelBadge({ level, className }) {
  const colors = {
    1: 'bg-red-100 text-red-700 border-red-200',
    2: 'bg-amber-100 text-amber-700 border-amber-200',
    3: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  
  const icons = {
    1: '🔴',
    2: '🟡',
    3: '🟢',
  };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-medium border",
        colors[level] || 'bg-slate-100 text-slate-700 border-slate-200',
        className
      )}
    >
      {icons[level]} L{level}
    </Badge>
  );
}