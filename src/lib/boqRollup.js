/**
 * BOQ Aggregation & Rollup Utilities
 * Memoized Level 1 / Level 2 subtotal calculations for large BOQ lists (500+ lines).
 * Prevents UI freezing by computing rollups in a single pass with useMemo.
 */

import { useMemo } from 'react';

/**
 * Build a flat-to-hierarchical rollup of BOQ items.
 * Computes subtotals for Level 1 and Level 2 parent items from their Level 3 children.
 *
 * @param {Array} flatItems - Flat list of BOQ items (all levels)
 * @returns {Object} { items: hierarchical array, subtotals: { [id]: { quantity, total_amount } } }
 */
export function computeBOQRollup(flatItems) {
  const subtotals = {};

  // Group by level
  const level1Items = flatItems.filter(i => i.level === 1);
  const level2Items = flatItems.filter(i => i.level === 2);
  const level3Items = flatItems.filter(i => i.level === 3);

  // Build parent->children maps
  const childrenOfL2 = {};
  for (const l3 of level3Items) {
    const parentId = l3.parent_id;
    if (!parentId) continue;
    if (!childrenOfL2[parentId]) childrenOfL2[parentId] = [];
    childrenOfL2[parentId].push(l3);
  }

  const childrenOfL1 = {};
  for (const l2 of level2Items) {
    const parentId = l2.parent_id;
    if (!parentId) continue;
    if (!childrenOfL1[parentId]) childrenOfL1[parentId] = [];
    childrenOfL1[parentId].push(l2);
  }

  // Compute Level 2 subtotals from Level 3 children
  for (const l2 of level2Items) {
    const children = childrenOfL2[l2.id] || [];
    const qty = children.reduce((s, c) => s + (parseFloat(c.quantity) || 0), 0);
    const total = children.reduce((s, c) => s + (parseFloat(c.total_amount) || ((parseFloat(c.quantity) || 0) * (parseFloat(c.unit_price) || 0))), 0);
    subtotals[l2.id] = { quantity: qty, total_amount: total };
  }

  // Compute Level 1 subtotals from Level 2 children
  for (const l1 of level1Items) {
    const l2Children = childrenOfL1[l1.id] || [];
    const qty = l2Children.reduce((s, l2) => s + (subtotals[l2.id]?.quantity || 0), 0);
    const total = l2Children.reduce((s, l2) => s + (subtotals[l2.id]?.total_amount || 0), 0);
    subtotals[l1.id] = { quantity: qty, total_amount: total };
  }

  return subtotals;
}

/**
 * React hook for memoized BOQ rollup.
 * Recalculates only when the flat items array reference changes.
 */
export function useBOQRollup(flatItems) {
  return useMemo(() => computeBOQRollup(flatItems), [flatItems]);
}

/**
 * Get subtotal for a specific item from the rollup map.
 */
export function getSubtotal(subtotals, itemId) {
  return subtotals[itemId] || { quantity: 0, total_amount: 0 };
}
