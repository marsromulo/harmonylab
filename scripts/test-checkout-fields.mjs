import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require: (name) => {
      assert.equal(name, "react/jsx-runtime");
      return { jsx: (type, props) => ({ type, props }) };
    },
  });
  return exports;
}

const { normalizePhone } = load("src/lib/customer-fields.ts");
const { PhoneInput } = load("src/components/PhoneInput.tsx");
const pattern = new RegExp(`^(?:${PhoneInput({}).props.pattern})$`, "v");
for (const [input, expected] of [
  ["9123 4567", "91234567"],
  ["+852 9123 4567", "+85291234567"],
  ["+63 (917) 123-4567", "+639171234567"],
  ["0917 123 4567", "09171234567"],
  ["020 7946 0958", "02079460958"],
  ["+1 (212) 555-0123", "+12125550123"],
  ["85212345", "85212345"],
  ["123.456.7890", "1234567890"],
]) {
  assert.equal(normalizePhone(input), expected);
  assert(pattern.test(input), `Browser should accept ${input}`);
}
for (const input of ["abc1234567", "123", "1234567890123456", "++639171234567", "123+4567890"]) {
  assert.equal(normalizePhone(input), "");
  assert(!pattern.test(input), `Browser should reject ${input}`);
}
assert.equal(normalizePhone(""), "");

const { getPickupQuote } = load("src/lib/pickup.ts");
for (const shippingCents of [0, 5000, 18000]) {
  const quote = {
    shippingCents,
    discountCents: 2000,
    totalCents: 20000 + shippingCents - 2000,
    discountDetails: [{ type: "shipping" }, { type: "referral" }],
  };
  const pickup = getPickupQuote(quote);
  assert.equal(pickup.shippingCents, 0);
  assert.equal(pickup.totalCents, 18000);
  assert.equal(pickup.discountCents, 2000);
  assert.equal(pickup.discountDetails.length, 1);
  assert.equal(pickup.discountDetails[0].type, "referral");
  assert.equal(getPickupQuote(pickup).totalCents, pickup.totalCents);
  assert.equal(quote.shippingCents, shippingCents);
}
console.log("PASS: optional country codes, browser/server validation, and free pickup totals.");
