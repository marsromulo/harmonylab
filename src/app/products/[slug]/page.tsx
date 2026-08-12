import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AddToCartForm } from "@/components/AddToCartForm";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { ProductReviews } from "@/components/ProductReviews";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatProductPrice, getProductBySlug } from "@/lib/products";

type ProductDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | Harmony Lab",
    };
  }

  return {
    title: `${product.name} | Harmony Lab`,
    description: product.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  await connection();
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="page">
      <SiteHeader active="products" />
      <main className="product-detail-page">
        <nav className="product-breadcrumb" aria-label="Breadcrumb">
          <Link href="/products">Products</Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        <section className="product-detail">
          <ProductImageGallery product={product} />

          <div className="product-detail-copy">
            <p className="eyebrow">HARMONY LAB</p>
            <h1>{product.name}</h1>
            <p className="product-detail-price">{formatProductPrice(product)}</p>
            {product.description ? (
              <div className="product-detail-description" dangerouslySetInnerHTML={{ __html: product.description }} />
            ) : null}
            <AddToCartForm buttonClassName="product-detail-cart" productId={product.id} showQuantity />
          </div>
        </section>

        <ProductReviews />
      </main>
      <SiteFooter />
    </div>
  );
}
