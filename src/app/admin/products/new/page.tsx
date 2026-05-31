import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireAdmin } from "@/lib/admin-auth";
import { getNextAdminProductSortOrder } from "@/lib/products";
import { createProductAction } from "../actions";

export const metadata: Metadata = {
  title: "New Product | Harmony Lab Admin",
  description: "Create a product in Harmony Lab admin.",
};

export default async function NewProductPage() {
  await requireAdmin();
  const nextSortOrder = await getNextAdminProductSortOrder();

  return (
    <AdminShell active="products">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">PRODUCT CATALOG</p>
          <h1>New Product</h1>
        </div>
      </section>

      <section className="admin-panel admin-form-panel">
        <ProductForm action={createProductAction} mode="create" nextSortOrder={nextSortOrder} />
      </section>
    </AdminShell>
  );
}
