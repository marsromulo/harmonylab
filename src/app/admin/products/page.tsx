import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductDeleteButton } from "@/components/admin/ProductDeleteButton";
import { formatProductPrice, getAdminProducts, getProductDescriptionPreview } from "@/lib/products";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteProductAction } from "./actions";

export const metadata: Metadata = {
  title: "Products | Harmony Lab Admin",
  description: "Read-only product list for Harmony Lab admin.",
};

export default async function AdminProductsPage() {
  await connection();
  await requireAdmin();
  const products = await getAdminProducts(100);

  return (
    <AdminShell active="products">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">PRODUCT CATALOG</p>
          <h1>Products</h1>
        </div>
        <div className="admin-heading-actions">
          <span>{products.length} products</span>
          <Link className="admin-btn admin-link-btn" href="/admin/products/new">
            Add Product
          </Link>
        </div>
      </section>

      <section className="admin-panel admin-table-panel admin-products-panel">
        <div className="admin-panel-head">
          <h2>Product Items</h2>
          <a>Manage Catalog</a>
        </div>
        <table className="admin-products-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Slug</th>
              <th>Regular Price</th>
              <th>Member Price</th>
              <th>NUC Points</th>
              <th>Inventory</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="admin-product-cell">
                    <Image
                      className="admin-product-image"
                      src={product.imageUrl}
                      alt={product.name}
                      width={56}
                      height={56}
                    />
                    <span>
                      <Link className="admin-product-title-link" href={`/admin/products/${product.id}/edit`}>
                        {product.name}
                      </Link>
                      <small>{getProductDescriptionPreview(product.description)}</small>
                    </span>
                  </div>
                </td>
                <td>{product.slug}</td>
                <td>{formatProductPrice({ currency: product.currency, priceCents: product.regularPriceCents })}</td>
                <td>{formatProductPrice({ currency: product.currency, priceCents: product.memberPriceCents })}</td>
                <td>{product.nucPoints.toFixed(2)}</td>
                <td>{product.inventoryQuantity}</td>
                <td>
                  <span className={product.isActive ? "admin-status active" : "admin-status inactive"}>
                    {product.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="admin-table-actions">
                    <Link className="admin-table-action" href={`/admin/products/${product.id}/edit`}>
                      Edit
                    </Link>
                    <ProductDeleteButton action={deleteProductAction.bind(null, product.id)} productName={product.name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
