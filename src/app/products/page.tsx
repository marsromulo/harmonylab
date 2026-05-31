import { connection } from "next/server";
import { ProductCard } from "@/components/ProductCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getFeaturedProducts } from "@/lib/products";

export default async function ProductsPage() {
  await connection();
  const products = await getFeaturedProducts();

  return (
    <div className="page">
      <SiteHeader active="products" />
      <main className="products-page">
        <div className="section-head products-page-head">
          <div>
            <p className="eyebrow">SHOP SKINCARE</p>
            <h2>Products</h2>
          </div>
        </div>
        <div className="grid products">
          {products.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
