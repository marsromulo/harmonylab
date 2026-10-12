import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

let returnedOrder;
let calledFunction;
const supabase = {
  from: () => ({ select: () => ({ in: () => ({ eq: async () => ({
    data: [{ id: "product", name: "Product", inventory_quantity: 10 }], error: null,
  }) }) }) }),
  rpc: async (name) => {
    calledFunction = name;
    return { data: [returnedOrder], error: null };
  },
};
const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/lib/checkout.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, {
  exports,
  require: (name) => {
    assert.equal(name, "@/lib/supabase/server");
    return { createSupabaseServiceRoleClient: () => supabase };
  },
});
const input = {
  deliveryMethod: "pickup", expectedSubtotalCents: 46000,
  lines: [{ productId: "product", quantity: 1 }],
};
returnedOrder = { id: "order", order_number: "test", currency: "HKD", shipping_cents: 0,
  discount_cents: 0, total_cents: 46000, discount_details: [] };
assert.equal((await exports.createCheckoutOrder(input)).totalCents, 46000);
assert.equal(calledFunction, "create_checkout_pickup_order");
returnedOrder = { ...returnedOrder, discount_cents: 2000, total_cents: 44000 };
assert.equal((await exports.createCheckoutOrder(input)).totalCents, 44000);
returnedOrder = { ...returnedOrder, shipping_cents: 5000, total_cents: 49000 };
await assert.rejects(exports.createCheckoutOrder(input), /Office pickup pricing is invalid/);
returnedOrder = { ...returnedOrder, shipping_cents: 0 };
await assert.rejects(exports.createCheckoutOrder(input), /Office pickup pricing is invalid/);
returnedOrder = { ...returnedOrder, shipping_cents: 5000 };
assert.equal((await exports.createCheckoutOrder({ ...input, deliveryMethod: "delivery" })).shippingCents, 5000);
assert.equal(calledFunction, "create_checkout_order");
console.log("PASS: pickup uses the transactional RPC, preserves discounts, and rejects shipping or incorrect totals before payment.");
