/**
 * Automated Double-Entry Financial Engine
 * Generates balanced JournalEntry + JournalEntryLine records on document approvals.
 *
 * Each posting function:
 * 1. Creates a JournalEntry (header) with status 'posted'
 * 2. Creates JournalEntryLine records (balanced debit/credit)
 * 3. Returns the created entry for caller use
 *
 * GL Account types are resolved by account_code pattern:
 * - 1xxxxx = Assets
 * - 2xxxxx = Liabilities
 * - 4xxxxx = Revenue
 * - 5xxxxx = Project Costs / Expenses
 * - 6xxxxx = Indirect Costs
 */

import { base44 } from '@/api/base44Client';

/**
 * Find a GL account by code pattern within the company's accounts.
 * @param {Array} accounts - GL accounts array
 * @param {string} codePattern - Partial account code to match
 * @returns {Object|null} Matching account or null
 */
export function findAccountByCode(accounts, codePattern) {
  return accounts.find(a =>
    a.account_code && a.account_code.startsWith(codePattern)
  ) || null;
}

/**
 * Create a balanced journal entry with lines.
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.sourceDocumentType - 'GRN', 'SUPPLIER_INVOICE', 'CLIENT_IPC', 'SUBCONTRACTOR_IPC', 'PAYMENT', 'RECEIPT'
 * @param {string} params.sourceDocumentId - ID of the source document
 * @param {string} params.sourceDocumentNumber - Display number of the source document
 * @param {string} params.entryDate - ISO date string
 * @param {string} params.description - Entry description
 * @param {Array} params.lines - [{ account_id, description, debit_amount, credit_amount, cost_center_id }]
 * @param {Array} accounts - GL accounts for lookup
 * @returns {Object} Created journal entry
 */
export async function createJournalPosting({
  companyId,
  sourceDocumentType,
  sourceDocumentId,
  sourceDocumentNumber,
  entryDate,
  description,
  lines,
  accounts,
}) {
  // Filter out zero lines
  const validLines = lines.filter(l =>
    l.account_id && ((parseFloat(l.debit_amount) || 0) > 0 || (parseFloat(l.credit_amount) || 0) > 0)
  );

  if (validLines.length === 0) return null;

  // Validate balanced
  const totalDebit = validLines.reduce((s, l) => s + (parseFloat(l.debit_amount) || 0), 0);
  const totalCredit = validLines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    console.error(`[GL Engine] Unbalanced entry for ${sourceDocumentType} ${sourceDocumentNumber}: Debit=${totalDebit}, Credit=${totalCredit}`);
    throw new Error('Unbalanced journal entry');
  }

  const entryNumber = `JE-${sourceDocumentType}-${Date.now().toString().slice(-6)}`;

  // Create journal entry header
  const entry = await base44.entities.JournalEntry.create({
    company_id: companyId,
    entry_number: entryNumber,
    entry_date: entryDate,
    description: `${description} (${sourceDocumentNumber || sourceDocumentType})`,
    status: 'posted',
    total_debit: totalDebit,
    total_credit: totalCredit,
    source_document_type: sourceDocumentType,
    source_document_id: sourceDocumentId,
  });

  // Create lines
  for (let i = 0; i < validLines.length; i++) {
    const line = validLines[i];
    await base44.entities.JournalEntryLine.create({
      entry_id: entry.id,
      line_no: i + 1,
      account_id: line.account_id,
      description: line.description || description,
      debit_amount: parseFloat(line.debit_amount) || 0,
      credit_amount: parseFloat(line.credit_amount) || 0,
      cost_center_id: line.cost_center_id || null,
    });
  }

  return entry;
}

/**
 * Post GL entries on GRN Approval.
 * Debit: Project Cost Center (or Inventory Asset)
 * Credit: Accounts Payable Unbilled / Accrued Purchases (GR/IR)
 */
export async function postGRNApproval({ grn, grnLines, accounts, companyId, costCenterId }) {
  const inventoryAcct = findAccountByCode(accounts, '13') || findAccountByCode(accounts, '14');
  const grirAcct = findAccountByCode(accounts, '22');

  if (!inventoryAcct || !grirAcct) {
    console.warn('[GL Engine] Missing accounts for GRN posting');
    return null;
  }

  const totalValue = grnLines.reduce((s, l) => s + ((parseFloat(l.quantity_received) || 0) * (parseFloat(l.unit_cost) || 0)), 0);

  return createJournalPosting({
    companyId,
    sourceDocumentType: 'GRN',
    sourceDocumentId: grn.id,
    sourceDocumentNumber: grn.grn_number,
    entryDate: grn.grn_date || new Date().toISOString(),
    description: 'GRN Goods Receipt',
    accounts,
    lines: [
      { account_id: inventoryAcct.id, description: 'Inventory / Project Cost', debit_amount: totalValue, credit_amount: 0, cost_center_id: costCenterId },
      { account_id: grirAcct.id, description: 'GR/IR Accrued Purchases', debit_amount: 0, credit_amount: totalValue },
    ],
  });
}

/**
 * Post GL entries on Supplier Invoice Match & Approval.
 * Debit: AP Unbilled (clearing GR/IR)
 * Debit: 14% VAT Input Tax
 * Credit: Supplier Accounts Payable
 * Credit: 1% WHT Tax Liability
 */
export async function postSupplierInvoiceApproval({ invoice, accounts, companyId, supplierId }) {
  const grirAcct = findAccountByCode(accounts, '22');
  const vatInputAcct = findAccountByCode(accounts, '151') || findAccountByCode(accounts, '152');
  const apAcct = findAccountByCode(accounts, '21');
  const whtLiabilityAcct = findAccountByCode(accounts, '23');

  if (!grirAcct || !apAcct) {
    console.warn('[GL Engine] Missing accounts for supplier invoice posting');
    return null;
  }

  const netAmount = parseFloat(invoice.net_amount) || parseFloat(invoice.total_amount) || 0;
  const vatAmount = parseFloat(invoice.vat_amount) || netAmount * 0.14;
  const whtAmount = parseFloat(invoice.wht_amount) || netAmount * 0.01;
  const grossAmount = netAmount + vatAmount - whtAmount;

  return createJournalPosting({
    companyId,
    sourceDocumentType: 'SUPPLIER_INVOICE',
    sourceDocumentId: invoice.id,
    sourceDocumentNumber: invoice.invoice_number || '',
    entryDate: invoice.invoice_date || new Date().toISOString(),
    description: 'Supplier Invoice Approval',
    accounts,
    lines: [
      { account_id: grirAcct.id, description: 'Clear GR/IR', debit_amount: netAmount, credit_amount: 0 },
      ...(vatInputAcct ? [{ account_id: vatInputAcct.id, description: 'VAT Input 14%', debit_amount: vatAmount, credit_amount: 0 }] : []),
      { account_id: apAcct.id, description: 'Supplier AP', debit_amount: 0, credit_amount: grossAmount },
      ...(whtLiabilityAcct ? [{ account_id: whtLiabilityAcct.id, description: 'WHT 1% Liability', debit_amount: 0, credit_amount: whtAmount }] : []),
    ],
  });
}

/**
 * Post GL entries on Client IPC Approval.
 * Debit: Client Accounts Receivable (Trade Debtors)
 * Debit: Retention Receivable (Asset)
 * Credit: Contract Revenue (Project P&L)
 * Credit: 14% VAT Output Tax
 */
export async function postClientIPCApproval({ ipc, accounts, companyId, costCenterId }) {
  const arAcct = findAccountByCode(accounts, '12');
  const retentionReceivableAcct = findAccountByCode(accounts, '129') || findAccountByCode(accounts, '128');
  const revenueAcct = findAccountByCode(accounts, '41');
  const vatOutputAcct = findAccountByCode(accounts, '241') || findAccountByCode(accounts, '242');

  if (!arAcct || !revenueAcct) {
    console.warn('[GL Engine] Missing accounts for client IPC posting');
    return null;
  }

  const workValue = parseFloat(ipc.current_gross_amount) || 0;
  const retentionAmount = parseFloat(ipc.retention_amount) || 0;
  const vatAmount = parseFloat(ipc.vat_amount) || workValue * 0.14;
  const receivableAmount = workValue - retentionAmount + vatAmount;

  return createJournalPosting({
    companyId,
    sourceDocumentType: 'CLIENT_IPC',
    sourceDocumentId: ipc.id,
    sourceDocumentNumber: ipc.ipc_number || '',
    entryDate: ipc.ipc_date || new Date().toISOString(),
    description: 'Client IPC Certification',
    accounts,
    lines: [
      { account_id: arAcct.id, description: 'Client AR', debit_amount: receivableAmount, credit_amount: 0, cost_center_id: costCenterId },
      ...(retentionReceivableAcct && retentionAmount > 0 ? [{ account_id: retentionReceivableAcct.id, description: 'Retention Receivable', debit_amount: retentionAmount, credit_amount: 0, cost_center_id: costCenterId }] : []),
      { account_id: revenueAcct.id, description: 'Contract Revenue', debit_amount: 0, credit_amount: workValue, cost_center_id: costCenterId },
      ...(vatOutputAcct ? [{ account_id: vatOutputAcct.id, description: 'VAT Output 14%', debit_amount: 0, credit_amount: vatAmount }] : []),
    ],
  });
}

/**
 * Post GL entries on Subcontractor IPC Approval.
 * Debit: Subcontractor Direct Project Expense (Project Cost Center)
 * Debit: 14% VAT Input Tax
 * Credit: Subcontractor Accounts Payable
 * Credit: Retention Payable (Liability)
 * Credit: 1% WHT Tax Liability
 */
export async function postSubcontractorIPCApproval({ ipc, accounts, companyId, costCenterId }) {
  const subcontractExpenseAcct = findAccountByCode(accounts, '53') || findAccountByCode(accounts, '52');
  const vatInputAcct = findAccountByCode(accounts, '151') || findAccountByCode(accounts, '152');
  const apAcct = findAccountByCode(accounts, '21');
  const retentionPayableAcct = findAccountByCode(accounts, '25');
  const whtLiabilityAcct = findAccountByCode(accounts, '23');

  if (!subcontractExpenseAcct || !apAcct) {
    console.warn('[GL Engine] Missing accounts for subcontractor IPC posting');
    return null;
  }

  const workValue = parseFloat(ipc.current_gross_amount) || 0;
  const retentionAmount = parseFloat(ipc.retention_amount) || 0;
  const vatAmount = parseFloat(ipc.vat_amount) || workValue * 0.14;
  const whtAmount = parseFloat(ipc.wht_amount) || workValue * 0.01;
  const payableAmount = workValue - retentionAmount + vatAmount - whtAmount;

  return createJournalPosting({
    companyId,
    sourceDocumentType: 'SUBCONTRACTOR_IPC',
    sourceDocumentId: ipc.id,
    sourceDocumentNumber: ipc.ipc_number || '',
    entryDate: ipc.ipc_date || new Date().toISOString(),
    description: 'Subcontractor IPC Approval',
    accounts,
    lines: [
      { account_id: subcontractExpenseAcct.id, description: 'Subcontractor Expense', debit_amount: workValue, credit_amount: 0, cost_center_id: costCenterId },
      ...(vatInputAcct ? [{ account_id: vatInputAcct.id, description: 'VAT Input 14%', debit_amount: vatAmount, credit_amount: 0 }] : []),
      { account_id: apAcct.id, description: 'Subcontractor AP', debit_amount: 0, credit_amount: payableAmount },
      ...(retentionPayableAcct && retentionAmount > 0 ? [{ account_id: retentionPayableAcct.id, description: 'Retention Payable', debit_amount: 0, credit_amount: retentionAmount }] : []),
      ...(whtLiabilityAcct ? [{ account_id: whtLiabilityAcct.id, description: 'WHT 1% Liability', debit_amount: 0, credit_amount: whtAmount }] : []),
    ],
  });
}

/**
 * Post GL entries on Payment / Receipt Voucher Execution.
 * Clears AP/AR against Cash/Bank and posts bank charges.
 */
export async function postPaymentVoucher({ voucher, accounts, companyId }) {
  const bankAcct = findAccountByCode(accounts, '111') || findAccountByCode(accounts, '11');
  const apAcct = findAccountByCode(accounts, '21');
  const arAcct = findAccountByCode(accounts, '12');
  const bankChargesAcct = findAccountByCode(accounts, '629') || findAccountByCode(accounts, '68');

  if (!bankAcct) {
    console.warn('[GL Engine] Missing bank account for payment posting');
    return null;
  }

  const amount = parseFloat(voucher.amount) || 0;
  const bankCharges = parseFloat(voucher.bank_charges) || 0;
  const isPayment = voucher.voucher_type === 'payment';
  const counterpartAcct = isPayment ? apAcct : arAcct;

  if (!counterpartAcct) {
    console.warn('[GL Engine] Missing AP/AR account for payment posting');
    return null;
  }

  const lines = isPayment
    ? [
        { account_id: apAcct.id, description: 'Clear Supplier AP', debit_amount: amount, credit_amount: 0 },
        { account_id: bankAcct.id, description: 'Bank Payment', debit_amount: 0, credit_amount: amount + bankCharges },
        ...(bankChargesAcct && bankCharges > 0 ? [{ account_id: bankChargesAcct.id, description: 'Bank Charges', debit_amount: bankCharges, credit_amount: 0 }] : []),
      ]
    : [
        { account_id: bankAcct.id, description: 'Bank Receipt', debit_amount: amount - bankCharges, credit_amount: 0 },
        ...(bankChargesAcct && bankCharges > 0 ? [{ account_id: bankChargesAcct.id, description: 'Bank Charges', debit_amount: bankCharges, credit_amount: 0 }] : []),
        { account_id: arAcct.id, description: 'Clear Client AR', debit_amount: 0, credit_amount: amount },
      ];

  return createJournalPosting({
    companyId,
    sourceDocumentType: isPayment ? 'PAYMENT' : 'RECEIPT',
    sourceDocumentId: voucher.id,
    sourceDocumentNumber: voucher.voucher_number || '',
    entryDate: voucher.voucher_date || new Date().toISOString(),
    description: isPayment ? 'Payment Voucher' : 'Receipt Voucher',
    accounts,
    lines,
  });
}
