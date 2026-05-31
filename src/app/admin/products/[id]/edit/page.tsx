import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminProductById, getNextAdminProductSortOrder } from "@/lib/products";
import { updateProductAction } from "../../actions";

export const metadata: Metadata = {
  title: "Edit Product | Harmony Lab Admin",
  description: "Edit a product in Harmony Lab admin.",
};

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditProductPage({ params }: EditProductPageProps) {
  await requireAdmin();
  const { id } = await params;
  const [product, nextSortOrder] = await Promise.all([getAdminProductById(id), getNextAdminProductSortOrder()]);

  if (!product) {
    notFound();
  }

  const updateProduct = updateProductAction.bind(null, product.id);

  return (
    <AdminShell active="products">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">PRODUCT CATALOG</p>
          <h1>Edit Product</h1>
        </div>
      </section>

      <section className="admin-panel admin-form-panel">
        <ProductForm action={updateProduct} product={product} mode="edit" nextSortOrder={nextSortOrder} />
      </section>
    </AdminShell>
  );
}
