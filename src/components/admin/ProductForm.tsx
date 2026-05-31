"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StoreProduct } from "@/lib/products";
import { RichTextEditor } from "./RichTextEditor";

type ProductFormProps = {
  action: (formData: FormData) => Promise<void>;
  product?: StoreProduct;
  mode: "create" | "edit";
  nextSortOrder?: number;
};

const MAX_IMAGES = 8;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm({ action, product, mode, nextSortOrder }: ProductFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [productName, setProductName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPreviewIndex, setDraggedPreviewIndex] = useState<number | null>(null);

  const previewUrls = useMemo(() => selectedFiles.map((file) => URL.createObjectURL(file)), [selectedFiles]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  function syncInputFiles(files: File[]) {
    if (!fileInputRef.current) {
      setSelectedFiles(files);
      return;
    }

    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    fileInputRef.current.files = dataTransfer.files;
    setSelectedFiles(files);
  }

  function addFiles(files: File[]) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const nextFiles = [...selectedFiles, ...imageFiles].filter(
      (file, index, allFiles) =>
        index ===
        allFiles.findIndex(
          (candidate) =>
            candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified,
        ),
    );

    syncInputFiles(nextFiles.slice(0, MAX_IMAGES));
  }

  function removeFile(indexToRemove: number) {
    syncInputFiles(selectedFiles.filter((_, index) => index !== indexToRemove));
  }

  function reorderFiles(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) {
      setDraggedPreviewIndex(null);
      return;
    }

    const nextFiles = [...selectedFiles];
    const [movedFile] = nextFiles.splice(fromIndex, 1);
    nextFiles.splice(toIndex, 0, movedFile);
    syncInputFiles(nextFiles);
    setDraggedPreviewIndex(null);
  }

  return (
    <form action={action} className="admin-product-form">
      <div className="admin-form-grid">
        <label>
          Product Name
          <input
            name="name"
            required
            value={productName}
            onBlur={() => {
              if (!slug.trim()) {
                setSlug(slugify(productName));
              }
            }}
            onChange={(event) => setProductName(event.currentTarget.value)}
          />
        </label>
        <label>
          Slug
          <input
            name="slug"
            placeholder="auto-filled from product name"
            value={slug}
            onChange={(event) => setSlug(event.currentTarget.value)}
          />
        </label>
        <label>
          Price
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={product ? (product.priceCents / 100).toFixed(2) : ""}
          />
        </label>
        <label>
          Currency
          <input name="currency" required defaultValue={product?.currency ?? "HKD"} />
        </label>
        <label>
          Inventory
          <input
            name="inventory_quantity"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={product?.inventoryQuantity ?? 0}
          />
        </label>
        <label>
          <span className="admin-label-row">
            <span>Sort Order</span>
            {nextSortOrder ? <small>Next: {nextSortOrder}</small> : null}
          </span>
          <input name="sort_order" type="number" step="1" required defaultValue={product?.sortOrder ?? nextSortOrder ?? 0} />
        </label>
      </div>

      <input name="image_url" type="hidden" defaultValue={product?.imageUrl ?? ""} />

      {product?.images.length ? (
        <div className="admin-current-images">
          <span>Current Images</span>
          <div className="admin-image-preview-grid">
            {product.images.map((image) => (
              <div className="admin-image-preview" key={image.id}>
                <span
                  className="admin-image-preview-thumb"
                  style={{ backgroundImage: `url(${image.imageUrl})` }}
                  role="img"
                  aria-label={image.altText ?? product.name}
                />
                {image.isPrimary ? <small>Primary</small> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className={isDragging ? "admin-image-dropzone dragging" : "admin-image-dropzone"}
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          ref={fileInputRef}
          className="admin-file-input"
          name="images"
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => addFiles(Array.from(event.currentTarget.files ?? []))}
        />
        <strong>Drop product images here</strong>
        <span>or click to upload up to {MAX_IMAGES} images</span>
      </div>

      {selectedFiles.length ? (
        <div className="admin-image-preview-grid">
          {selectedFiles.map((file, index) => (
            <div
              className={draggedPreviewIndex === index ? "admin-image-preview dragging" : "admin-image-preview"}
              draggable
              key={`${file.name}-${file.size}-${file.lastModified}`}
              onDragStart={(event) => {
                setDraggedPreviewIndex(index);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(index));
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDragEnd={() => setDraggedPreviewIndex(null)}
              onDrop={(event) => {
                event.preventDefault();
                const fromIndex = Number.parseInt(event.dataTransfer.getData("text/plain"), 10);

                if (Number.isFinite(fromIndex)) {
                  reorderFiles(fromIndex, index);
                }
              }}
            >
              <span
                className="admin-image-preview-thumb"
                style={{ backgroundImage: `url(${previewUrls[index]})` }}
                role="img"
                aria-label={file.name}
              />
              {index === 0 ? <small className="admin-image-primary-badge">Hero</small> : null}
              <button
                className="admin-image-remove"
                aria-label={`Remove ${file.name}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeFile(index);
                }}
              />
            </div>
          ))}
        </div>
      ) : null}

      <RichTextEditor defaultValue={product?.description} label="Description" name="description" />

      <label className="admin-checkbox-row">
        <input name="is_active" type="checkbox" defaultChecked={product?.isActive ?? true} />
        Active product
      </label>

      <div className="admin-form-actions">
        <Link className="admin-secondary-link" href="/admin/products">
          Cancel
        </Link>
        <button className="admin-btn" type="submit">
          {mode === "create" ? "Create Product" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
