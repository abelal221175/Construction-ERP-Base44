// Number formatting - ALWAYS use Western/English digits (never Eastern Arabic numerals)
export const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) return '-';
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
  // Force Western numerals in case of locale leakage
  return forceWesternNumerals(formatted);
};

/**
 * Force Western Arabic numerals in any string.
 * Converts Eastern Arabic numerals (٠-٩, ۰-۹) to Western (0-9).
 * Use this as a safety net for any number display.
 */
export const forceWesternNumerals = (str) => {
  if (str === null || str === undefined) return str;
  return str.toString()
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
};

export const formatCurrency = (num, currency = 'EGP', decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return `${formatNumber(num, decimals)} ${currency}`;
};

export const formatQuantity = (num, decimals = 4) => {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return formatNumber(num, decimals);
};

export const formatPercentage = (num, decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return `${formatNumber(num, decimals)}%`;
};

// Date formatting - always Western numerals
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return forceWesternNumerals(new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date));
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return forceWesternNumerals(new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date));
};

// Parse number from string (handles both Arabic-Indic and Eastern Arabic digits)
export const parseNumber = (str) => {
  if (!str) return 0;
  const westernStr = forceWesternNumerals(str.toString()).replace(/,/g, '');
  return parseFloat(westernStr) || 0;
};

// Get localized name based on language
export const getLocalizedName = (item, language, arField = 'name_ar', enField = 'name_en') => {
  if (!item) return '';
  if (language === 'ar') {
    return item[arField] || item[enField] || '';
  }
  return item[enField] || item[arField] || '';
};

// Status badge colors
export const getStatusColor = (status) => {
  const colors = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    submitted: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
    on_hold: 'bg-orange-100 text-orange-700 border-orange-200',
    closed: 'bg-slate-100 text-slate-600 border-slate-200',
    certified: 'bg-purple-100 text-purple-700 border-purple-200',
    invoiced: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    partial: 'bg-amber-100 text-amber-700 border-amber-200',
    received: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    sent: 'bg-blue-100 text-blue-700 border-blue-200',
    ordered: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
};

// Priority colors
export const getPriorityColor = (priority) => {
  const colors = {
    urgent: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    normal: 'bg-blue-100 text-blue-700 border-blue-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return colors[priority] || 'bg-slate-100 text-slate-700 border-slate-200';
};

// Generate auto code
export const generateCode = (prefix, sequence) => {
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
};