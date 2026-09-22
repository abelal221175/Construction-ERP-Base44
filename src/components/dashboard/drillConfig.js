// Drill-down configuration: maps a widget's valueKey (KPI) or chartKey (chart)
// to the entity + filter + columns that power the detail panel.

const col = (key, labelAr, labelEn, opts = {}) => ({ key, labelAr, labelEn, ...opts });

const PROJECT_COLS = [
  col('project_code', 'الكود', 'Code'),
  col('project_name', 'اسم المشروع', 'Project', { localized: true }),
  col('status', 'الحالة', 'Status'),
  col('contract_value', 'قيمة العقد', 'Contract', { type: 'currency' }),
];

const BP_COLS = [
  col('bp_code', 'الكود', 'Code'),
  col('bp_name', 'الاسم', 'Name', { localized: true }),
  col('is_client', 'عميل', 'Client', { type: 'bool' }),
  col('is_supplier', 'مورد', 'Supplier', { type: 'bool' }),
  col('phone', 'الهاتف', 'Phone'),
];

const PO_COLS = [
  col('po_number', 'رقم الأمر', 'PO No.'),
  col('status', 'الحالة', 'Status'),
  col('order_date', 'التاريخ', 'Date', { type: 'date' }),
  col('total_amount', 'القيمة', 'Amount', { type: 'currency' }),
];

const PR_COLS = [
  col('pr_number', 'رقم الطلب', 'PR No.'),
  col('status', 'الحالة', 'Status'),
  col('required_date', 'تاريخ الطلب', 'Req. Date', { type: 'date' }),
  col('total_amount', 'القيمة', 'Amount', { type: 'currency' }),
];

const GRN_COLS = [
  col('grn_number', 'رقم الاستلام', 'GRN No.'),
  col('status', 'الحالة', 'Status'),
  col('received_date', 'تاريخ الاستلام', 'Date', { type: 'date' }),
];

const IPC_COLS = [
  col('ipc_number', 'رقم المستخلص', 'IPC No.'),
  col('status', 'الحالة', 'Status'),
  col('ipc_date', 'التاريخ', 'Date', { type: 'date' }),
  col('total_amount', 'القيمة', 'Amount', { type: 'currency' }),
];

const APPROVAL_COLS = [
  col('document_type', 'النوع', 'Type'),
  col('status', 'الحالة', 'Status'),
  col('requested_by', 'بواسطة', 'Requested By'),
  col('request_date', 'التاريخ', 'Date', { type: 'date' }),
];

const BANK_COLS = [
  col('account_name', 'اسم الحساب', 'Account', { localized: true }),
  col('bank_name', 'البنك', 'Bank'),
  col('account_number', 'رقم الحساب', 'Account No.'),
  col('current_balance', 'الرصيد', 'Balance', { type: 'currency' }),
];

const SUB_COLS = [
  col('subcontract_number', 'رقم العقد', 'Sub No.'),
  col('status', 'الحالة', 'Status'),
  col('contract_date', 'تاريخ العقد', 'Date', { type: 'date' }),
  col('total_amount', 'القيمة', 'Amount', { type: 'currency' }),
];

const monthShort = (d) => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en', { month: 'short' });
};

export const DRILL_CONFIG = {
  // ── KPI (by valueKey) ──
  activeProjects: { entity: 'Project', filterFn: (r) => ['active', 'in_progress', 'on_going'].includes(r.status), columns: PROJECT_COLS },
  totalProjects: { entity: 'Project', columns: PROJECT_COLS },
  totalContractValue: { entity: 'Project', sortBy: 'contract_value', sortDir: 'desc', columns: PROJECT_COLS },
  businessPartners: { entity: 'BusinessPartner', columns: BP_COLS },
  openPOs: { entity: 'PurchaseOrder', filterFn: (r) => !['closed', 'cancelled'].includes(r.status), columns: PO_COLS },
  openPRs: { entity: 'PurchaseRequisition', filterFn: (r) => !['closed', 'cancelled', 'fulfilled'].includes(r.status), columns: PR_COLS },
  goodsReceived: { entity: 'GoodsReceivedNote', columns: GRN_COLS },
  clientIpcs: { entity: 'ClientIPC', columns: IPC_COLS },
  unpostedIpcs: { entity: 'ClientIPC', filterFn: (r) => !['posted', 'cancelled'].includes(r.status), columns: IPC_COLS },
  pendingApprovals: { entity: 'ApprovalRequest', filterFn: (r) => r.status === 'pending', columns: APPROVAL_COLS },
  cashPosition: { entity: 'BankAccount', columns: BANK_COLS },
  subcontracts: { entity: 'Subcontract', columns: SUB_COLS },

  // ── Charts (by chartKey) ──
  projectsByStatus: { entity: 'Project', segmentField: 'status', columns: PROJECT_COLS },
  topProjects: { entity: 'Project', sortBy: 'contract_value', sortDir: 'desc', columns: PROJECT_COLS },
  posByStatus: { entity: 'PurchaseOrder', segmentField: 'status', columns: PO_COLS },
  monthlyIpcs: {
    entity: 'ClientIPC',
    segmentField: 'ipcMonth',
    segmentValueFn: (r) => monthShort(r.ipc_date || r.created_date),
    columns: IPC_COLS,
  },
};