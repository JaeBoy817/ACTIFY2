import test from "node:test";
import assert from "node:assert/strict";

import { isLowStock } from "@/lib/budget-stock/service";

test("isLowStock uses explicit reorderPoint when provided", () => {
  assert.equal(isLowStock({ onHand: 3, parLevel: 20, reorderPoint: 4 }), true);
  assert.equal(isLowStock({ onHand: 5, parLevel: 20, reorderPoint: 4 }), false);
});

test("isLowStock falls back to 30% of par level", () => {
  assert.equal(isLowStock({ onHand: 2, parLevel: 10 }), true); // threshold 3
  assert.equal(isLowStock({ onHand: 4, parLevel: 10 }), false);
});
