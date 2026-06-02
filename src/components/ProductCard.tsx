import Image from "next/image";
import Link from "next/link";
import { AddToCartForm } from "@/components/AddToCartForm";
import { formatProductPrice, getProductDescriptionPreview, type StoreProduct } from "@/lib/products";

type ProductCardProps = {
  product: StoreProduct;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="card">
      <Link className="card-media-link" href={`/products/${product.slug}`}>
        <Image src={product.imageUrl} alt={product.name} width={205} height={205} />
      </Link>
      <h3>
        <Link href={`/products/${product.slug}`}>{product.name}</Link>
      </h3>
      <p className="card-description">{getProductDescriptionPreview(product.description)}</p>
      <p className="card-price">{formatProductPrice(product)}</p>
      <AddToCartForm productId={product.id} />
    </article>
  );
}
