import Image from "next/image";
import { formatProductPrice, type StoreProduct } from "@/lib/products";

type ProductCardProps = {
  product: StoreProduct;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="card">
      <Image src={product.imageUrl} alt={product.name} width={205} height={205} />
      <h3>{product.name}</h3>
      <p>{formatProductPrice(product)}</p>
      <button type="button">ADD TO CART</button>
    </article>
  );
}
