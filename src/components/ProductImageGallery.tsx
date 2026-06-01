"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { StoreProduct } from "@/lib/products";

type ProductImageGalleryProps = {
  product: StoreProduct;
};

export function ProductImageGallery({ product }: ProductImageGalleryProps) {
  const images = useMemo(() => {
    const galleryImages = product.images.length
      ? product.images.map((image) => ({
          alt: image.altText ?? product.name,
          id: image.id,
          url: image.imageUrl,
        }))
      : [];

    if (!galleryImages.some((image) => image.url === product.imageUrl)) {
      galleryImages.unshift({
        alt: product.name,
        id: "primary-image",
        url: product.imageUrl,
      });
    }

    return galleryImages;
  }, [product]);

  const [activeImageUrl, setActiveImageUrl] = useState(images[0]?.url ?? product.imageUrl);
  const activeImage = images.find((image) => image.url === activeImageUrl) ?? images[0];

  return (
    <div className="product-gallery">
      <div className="product-gallery-main">
        <Image
          src={activeImage?.url ?? product.imageUrl}
          alt={activeImage?.alt ?? product.name}
          width={610}
          height={610}
          priority
        />
      </div>

      {images.length > 1 ? (
        <div className="product-gallery-thumbs" aria-label="Product images">
          {images.map((image) => (
            <button
              className={image.url === activeImageUrl ? "active" : undefined}
              key={`${image.id}-${image.url}`}
              type="button"
              onClick={() => setActiveImageUrl(image.url)}
              aria-label={`View ${image.alt}`}
            >
              <Image src={image.url} alt="" width={86} height={86} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
