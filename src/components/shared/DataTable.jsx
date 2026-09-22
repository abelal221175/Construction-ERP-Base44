import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  Pencil,
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { cn } from "@/lib/utils";

export default function DataTable({
  columns,
  data,
  onRowClick,
  onEdit,
  onDelete,
  onView,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  searchable = true,
  searchPlaceholder,
  actions = [],
  emptyMessage,
  isLoading = false,
  pageSize = 10,
}) {
  const { t, isRTL } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search
  const filteredData = data.filter(item => {
    if (!searchTerm) return true;
    return columns.some(col => {
      const value = col.accessor ? item[col.accessor] : '';
      return String(value).toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key] || '';
    const bVal = b[sortConfig.key] || '';
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange?.(paginatedData.map(item => item.id));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      onSelectionChange?.([...selectedRows, id]);
    } else {
      onSelectionChange?.(selectedRows.filter(rowId => rowId !== id));
    }
  };

  const allSelected = paginatedData.length > 0 && 
    paginatedData.every(item => selectedRows.includes(item.id));

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      {searchable && (
        <div className="relative max-w-sm">
          <Search className={cn(
            "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400",
            isRTL ? "right-3" : "left-3"
          )} />
          <Input
            placeholder={searchPlaceholder || t('search')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={cn(
              "h-10 bg-white border-slate-200",
              isRTL ? "pr-10" : "pl-10"
            )}
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map((column, index) => (
                <TableHead
                  key={index}
                  className={cn(
                    "font-semibold text-slate-700",
                    column.sortable && "cursor-pointer hover:bg-slate-100 transition-colors",
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.accessor)}
                >
                  <div className={cn(
                    "flex items-center gap-2",
                    isRTL && "flex-row-reverse"
                  )}>
                    {column.header}
                    {column.sortable && (
                      <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </div>
                </TableHead>
              ))}
              {(onView || onEdit || onDelete || actions.length > 0) && (
                <TableHead className="w-20 text-center">{t('actions') || 'Actions'}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selectable ? 2 : 1)} 
                  className="h-32 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <div className="h-5 w-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    {t('loading')}
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selectable ? 2 : 1)} 
                  className="h-32 text-center text-slate-500"
                >
                  {emptyMessage || t('noData')}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={row.id || rowIndex}
                  className={cn(
                    "hover:bg-slate-50/80 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedRows.includes(row.id)}
                        onCheckedChange={(checked) => handleSelectRow(row.id, checked)}
                      />
                    </TableCell>
                  )}
                  {columns.map((column, colIndex) => (
                    <TableCell key={colIndex} className={column.cellClassName}>
                      {column.render 
                        ? column.render(row[column.accessor], row)
                        : row[column.accessor]
                      }
                    </TableCell>
                  ))}
                  {(onView || onEdit || onDelete || actions.length > 0) && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isRTL ? "start" : "end"}>
                            {onView && (
                              <DropdownMenuItem onClick={() => onView(row)}>
                                <Eye className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                {t('view')}
                              </DropdownMenuItem>
                            )}
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit(row)}>
                                <Pencil className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                {t('edit')}
                              </DropdownMenuItem>
                            )}
                            {actions.map((action, i) => (
                              <DropdownMenuItem key={i} onClick={() => action.onClick(row)}>
                                {action.icon && (
                                  <action.icon className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                )}
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                            {onDelete && (
                              <DropdownMenuItem 
                                onClick={() => onDelete(row)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                {t('delete')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={cn(
          "flex items-center justify-between px-2",
          isRTL && "flex-row-reverse"
        )}>
          <div className="text-sm text-slate-500">
            {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, sortedData.length)} / ${sortedData.length}`}
          </div>
          <div className={cn(
            "flex items-center gap-2",
            isRTL && "flex-row-reverse"
          )}>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <span className="text-sm font-medium px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}