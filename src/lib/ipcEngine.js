/**
 * Egyptian Statutory Billing & Cumulative IPC Calculation Engine
 * Shared by Client IPC and Subcontractor IPC modules.
 *
 * Implements:
 * - Cumulative quantity/amount tracking
 * - Advance Payment Recovery (amortization until balance = 0)
 * - Retention Deduction (5-10% with contractual cap)
 * - 14% Egyptian VAT on taxable net
 * - Withholding Tax (WHT 1% or 3%)
 * - Final Payable Amount
 */

export const EGYPTIAN_TAX = {
  VAT_RATE: 14,
  WHT_RATE_LOW: 1,
  WHT_RATE_HIGH: 3,
};

/**
 * Calculate a single IPC line item with cumulative logic.
 * @param {Object} item - BOQ line item with previous_quantity, previous_amount, unit_price
 * @param {number} currentQty - Current period executed quantity
 * @param {number} completionPct - Approved completion % (default 100)
 * @returns {Object} Updated item with cumulative_quantity, cumulative_amount, current_amount
 */
export function calculateIPCItem(item, currentQty, completionPct = 100) {
  const prevQty = parseFloat(item.previous_quantity) || 0;
  const prevAmt = parseFloat(item.previous_amount) || 0;
  const currQty = parseFloat(currentQty) || 0;
  const compPct = parseFloat(completionPct) || 100;
  const unitPrice = parseFloat(item.unit_price) || 0;

  // Cumulative Quantity = Previous Cumulative + Current
  const cumulativeQty = prevQty + currQty;

  // Cumulative Amount = Cumulative Qty × Approved % × Unit Rate
  const cumulativeAmt = cumulativeQty * (compPct / 100) * unitPrice;

  // Current Period Work Value = Cumulative Amount - Previous Cumulative Amount
  const currentAmt = cumulativeAmt - prevAmt;

  return {
    ...item,
    current_quantity: currQty,
    completion_percentage: compPct,
    cumulative_quantity: cumulativeQty,
    cumulative_amount: cumulativeAmt,
    current_amount: currentAmt,
  };
}

/**
 * Calculate the full IPC summary with Egyptian statutory deductions.
 *
 * @param {Array} items - IPC line items (already calculated)
 * @param {Object} params
 * @param {number} params.vatPercentage - VAT rate (default 14)
 * @param {number} params.whtPercentage - WHT rate (1 or 3, default 1)
 * @param {number} params.retentionPercentage - Retention % (5-10, default 10)
 * @param {number} params.retentionCap - Max cumulative retention (contractual cap, 0 = no cap)
 * @param {number} params.advancePaymentBalance - Remaining advance payment to recover
 * @param {number} params.advanceRecoveryPercentage - Amortization % per period (default 0)
 * @param {number} params.previousRetentionTotal - Total retention already held in prior IPCs
 * @param {Array} params.deductions - Additional custom deductions
 * @param {Array} params.additions - Additional custom additions
 * @returns {Object} Full IPC summary
 */
export function calculateIPCSummary(items, params = {}) {
  const {
    vatPercentage = EGYPTIAN_TAX.VAT_RATE,
    whtPercentage = EGYPTIAN_TAX.WHT_RATE_LOW,
    retentionPercentage = 10,
    retentionCap = 0,
    advancePaymentBalance = 0,
    advanceRecoveryPercentage = 0,
    previousRetentionTotal = 0,
    deductions = [],
    additions = [],
  } = params;

  // Gross amounts
  const cumulativeGross = items.reduce((s, i) => s + (parseFloat(i.cumulative_amount) || 0), 0);
  const previousCertified = items.reduce((s, i) => s + (parseFloat(i.previous_amount) || 0), 0);
  const currentGross = cumulativeGross - previousCertified;

  // --- Advance Payment Recovery ---
  // Deduct contractual amortization percentage until advance balance equals zero
  let advanceRecovery = 0;
  if (advancePaymentBalance > 0 && advanceRecoveryPercentage > 0) {
    advanceRecovery = Math.min(
      currentGross * (advanceRecoveryPercentage / 100),
      advancePaymentBalance
    );
  }

  // --- Retention Deduction ---
  // Deduct 5-10% from current period work value until cumulative retention matches cap
  const retentionThisPeriod = currentGross * (retentionPercentage / 100);
  const cumulativeRetention = previousRetentionTotal + retentionThisPeriod;
  let retentionAmount = retentionThisPeriod;
  if (retentionCap > 0 && cumulativeRetention > retentionCap) {
    retentionAmount = Math.max(0, retentionCap - previousRetentionTotal);
  }

  // --- Custom deductions/additions ---
  const totalCustomDeductions = deductions
    .filter(d => d.category !== 'retention' && d.category !== 'advance_recovery')
    .reduce((s, d) => {
      if (d.is_percentage && currentGross > 0) {
        return s + currentGross * (parseFloat(d.percentage) || 0) / 100;
      }
      return s + (parseFloat(d.amount) || 0);
    }, 0);

  const totalAdditions = additions.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

  // --- Taxable Net ---
  // Taxable = Current Gross - Advance Recovery (retention is NOT deducted before VAT)
  const taxableNet = currentGross - advanceRecovery + totalAdditions - totalCustomDeductions;

  // --- VAT 14% on taxable net ---
  const vatAmount = taxableNet * (vatPercentage / 100);

  // --- WHT (1% or 3%) on gross work value ---
  const whtAmount = currentGross * (whtPercentage / 100);

  // --- Final Payable ---
  // Final = Current Work Value - Advance Recovery - Retention + VAT - WHT + Additions - Custom Deductions
  const netPayable = currentGross - advanceRecovery - retentionAmount + vatAmount - whtAmount + totalAdditions - totalCustomDeductions;

  // Build deductions list for display
  const deductionsList = [
    { label: 'Advance Recovery', amount: advanceRecovery, percentage: advanceRecoveryPercentage || null },
    { label: 'Retention', amount: retentionAmount, percentage: retentionPercentage },
    ...deductions
      .filter(d => d.category !== 'retention' && d.category !== 'advance_recovery' && (parseFloat(d.amount) || 0) > 0)
      .map(d => ({
        label: d.category,
        amount: d.is_percentage ? currentGross * (parseFloat(d.percentage) || 0) / 100 : parseFloat(d.amount) || 0,
        percentage: d.is_percentage ? d.percentage : null,
      })),
  ].filter(d => d.amount > 0);

  const additionsList = additions
    .filter(a => (parseFloat(a.amount) || 0) > 0)
    .map(a => ({ label: a.category, amount: parseFloat(a.amount) || 0 }));

  return {
    cumulativeGross,
    previousCertified,
    currentGross,
    advanceRecovery,
    advancePaymentBalanceRemaining: Math.max(0, advancePaymentBalance - advanceRecovery),
    retentionAmount,
    cumulativeRetention: previousRetentionTotal + retentionAmount,
    retentionCap,
    totalCustomDeductions,
    totalDeductions: advanceRecovery + retentionAmount + totalCustomDeductions,
    totalAdditions,
    taxableNet,
    vatAmount,
    whtAmount,
    netPayable,
    deductionsList,
    additionsList,
  };
}

/**
 * Get localized label for deduction/addition categories.
 */
export function getDeductionLabel(category, language) {
  const labels = {
    retention: language === 'ar' ? 'ضمان الأعمال' : 'Retention',
    advance_recovery: language === 'ar' ? 'استرداد الدفعة المقدمة' : 'Advance Recovery',
    penalty: language === 'ar' ? 'غرامات' : 'Penalties',
    insurance: language === 'ar' ? 'تأمين' : 'Insurance',
    wht: language === 'ar' ? 'ضريبة الخصم تحت الحساب' : 'Withholding Tax',
    backcharge: language === 'ar' ? 'مقاصة' : 'Backcharge',
    other: language === 'ar' ? 'أخرى' : 'Other',
  };
  return labels[category] || category;
}

export function getAdditionLabel(category, language) {
  const labels = {
    variation: language === 'ar' ? 'أمر تغيير' : 'Variation',
    escalation: language === 'ar' ? 'تصعيد' : 'Escalation',
    materials_on_site: language === 'ar' ? 'مواد بالموقع' : 'Materials on Site',
    other: language === 'ar' ? 'أخرى' : 'Other',
  };
  return labels[category] || category;
}
