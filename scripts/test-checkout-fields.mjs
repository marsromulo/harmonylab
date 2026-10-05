import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);

function load(path) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require: (name) => {
      if (name.startsWith("@/")) {
        const base = name.replace("@/", "src/");
        return load(fs.existsSync(`${base}.tsx`) ? `${base}.tsx` : `${base}.ts`);
      }
      assert(["react", "react/jsx-runtime"].includes(name));
      return require(name);
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

const { COUNTRY_OPTIONS, getShippingCountry } = load("src/lib/countries.ts");
assert.equal(COUNTRY_OPTIONS.length, 249);
assert.equal(new Set(COUNTRY_OPTIONS).size, COUNTRY_OPTIONS.length);
for (const country of ["Hong Kong", "Philippines", "United States", "United Kingdom", "Australia", "Japan", "Singapore", "United Arab Emirates"]) {
  assert.equal(getShippingCountry(country), country);
}
assert.equal(getShippingCountry("invalid country"), "");
assert.equal(getShippingCountry(""), "");

const { AddressFields } = load("src/components/AddressFields.tsx");
for (const country of ["Philippines", "United States", "United Kingdom"]) {
  const html = renderToStaticMarkup(createElement(AddressFields, {
    address: { country, region: "Saved province", postalCode: "12345" },
  }));
  assert(html.includes(`value="${country}" selected=""`));
  assert(html.includes('name="region"') && html.includes('value="Saved province"'));
  assert(html.includes('name="postal_code"') && html.includes('value="12345"'));
  assert(!html.includes("disabled="));
}
const hongKong = renderToStaticMarkup(createElement(AddressFields, {}));
assert(hongKong.includes('<select name="region"'));
assert(!hongKong.includes('name="postal_code"'));
console.log("PASS: international country choices and saved address fields.");
