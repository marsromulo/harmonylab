import Image from "next/image";
import Link from "next/link";
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
      <button type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6h15l-2 8H8L6 6Z" />
          <path d="M6 6 5 3H2" />
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
        </svg>
        <span>ADD TO CART</span>
      </button>
    </article>
  );
}
