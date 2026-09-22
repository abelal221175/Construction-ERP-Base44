import { formatNumber } from '@/components/shared/formatters';

export const exportBOQToExcel = (boqItems, projectCode, language) => {
  // Build hierarchical structure
  const itemMap = {};
  boqItems.forEach(item => {
    itemMap[item.id] = { ...item, children: [] };
  });
  
  const roots = [];
  boqItems.forEach(item => {
    if (item.parent_boq_id && itemMap[item.parent_boq_id]) {
      itemMap[item.parent_boq_id].children.push(itemMap[item.id]);
    } else if (!item.parent_boq_id) {
      roots.push(itemMap[item.id]);
    }
  });

  const sortItems = (items) => {
    items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    items.forEach(item => sortItems(item.children));
  };
  sortItems(roots);

  const calculateSubtotal = (item) => {
    if (item.level === 3) {
      return (item.quantity || 0) * (item.unit_price || 0);
    }
    return item.children.reduce((sum, child) => sum + calculateSubtotal(child), 0);
  };

  const exportData = [];
  
  const flattenItems = (items, parentCode = '') => {
    items.forEach(item => {
      const total = item.level === 3 
        ? (item.quantity || 0) * (item.unit_price || 0) 
        : calculateSubtotal(item);
      
      exportData.push({
        'External Code': item.external_code || item.system_code || '',
        'Parent Code': parentCode,
        'Level': item.level,
        'Item Description': item.item_description || '',
        'UOM': item.uom || '',
        'Quantity': item.quantity || '',
        'Unit Price': item.unit_price || '',
        'Total Amount': total,
        'Has Cost Breakdown': item.has_cost_breakdown ? 'Yes' : 'No',
        'Notes': item.notes || '',
      });
      
      if (item.children) {
        flattenItems(item.children, item.external_code || item.system_code);
      }
    });
  };
  
  flattenItems(roots);

  // Create CSV
  const headers = ['External Code', 'Parent Code', 'Level', 'Item Description', 'UOM', 'Quantity', 'Unit Price', 'Total Amount', 'Has Cost Breakdown', 'Notes'];
  const csvRows = exportData.map(row => 
    headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
  );
  const csvContent = [headers.join(','), ...csvRows].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `BOQ_${projectCode || 'Export'}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  return { success: true, itemCount: exportData.length };
};