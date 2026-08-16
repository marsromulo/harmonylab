"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StoreProduct, StoreProductImage } from "@/lib/products";
import { RichTextEditor } from "./RichTextEditor";

type ProductFormProps = {
  action: (formData: FormData) => Promise<void>;
  product?: StoreProduct;
  mode: "create" | "edit";
  nextSortOrder?: number;
};

const MAX_IMAGES = 8;
const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const TARGET_IMAGE_SIZE_BYTES = 9.5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2000;
const COMPRESSED_IMAGE_TYPE = "image/jpeg";
const IMAGE_QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52];
const IMAGE_SCALE_STEPS = [1, 0.85, 0.7, 0.55];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getJpegFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "") || "product-image";
  return `${baseName}.jpg`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Unable to compress image."));
        }
      },
      type,
      quality,
    );
  });
}

async function compressImageFile(file: File) {
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(`${file.name} is ${formatFileSize(file.size)}. Product images must be ${MAX_IMAGE_SIZE_MB} MB or smaller.`);
    }

    return file;
  }

  let image: ImageBitmap;

  try {
    image = await createImageBitmap(file);
  } catch {
    if (file.size <= MAX_IMAGE_SIZE_BYTES) {
      return file;
    }

    throw new Error(`${file.name} could not be compressed. Product images must be ${MAX_IMAGE_SIZE_MB} MB or smaller.`);
  }

  const baseScale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
  let bestBlob: Blob | null = null;

  try {
    for (const scaleStep of IMAGE_SCALE_STEPS) {
      const scale = baseScale * scaleStep;
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to prepare image compression.");
      }

      canvas.width = width;
      canvas.height = height;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      for (const quality of IMAGE_QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, COMPRESSED_IMAGE_TYPE, quality);

        if (!bestBlob || blob.size < bestBlob.size) {
          bestBlob = blob;
        }

        if (blob.size <= TARGET_IMAGE_SIZE_BYTES) {
          const compressedFile = new File([blob], getJpegFileName(file.name), {
            type: COMPRESSED_IMAGE_TYPE,
            lastModified: Date.now(),
          });

          return file.size <= MAX_IMAGE_SIZE_BYTES && file.size <= compressedFile.size ? file : compressedFile;
        }
      }
    }
  } finally {
    image.close();
  }

  if (file.size <= MAX_IMAGE_SIZE_BYTES && (!bestBlob || file.size <= bestBlob.size)) {
    return file;
  }

  if (bestBlob && bestBlob.size <= MAX_IMAGE_SIZE_BYTES) {
    return new File([bestBlob], getJpegFileName(file.name), {
      type: COMPRESSED_IMAGE_TYPE,
      lastModified: Date.now(),
    });
  }

  throw new Error(`${file.name} could not be compressed below ${MAX_IMAGE_SIZE_MB} MB. Please use a smaller image.`);
}

export function ProductForm({ action, product, mode, nextSortOrder }: ProductFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [productName, setProductName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(mode === "edit");
  const [currentImages, setCurrentImages] = useState<StoreProductImage[]>(product?.images ?? []);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const selectedFilesRef = useRef<File[]>([]);
  const [isCompressingImages, setIsCompressingImages] = useState(false);
  const [imageUploadMessage, setImageUploadMessage] = useState("");
  const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
  const [videoUploadMessage, setVideoUploadMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCurrentImageIndex, setDraggedCurrentImageIndex] = useState<number | null>(null);
  const [draggedPreviewIndex, setDraggedPreviewIndex] = useState<number | null>(null);

  const previewUrls = useMemo(() => selectedFiles.map((file) => URL.createObjectURL(file)), [selectedFiles]);
  const videoPreviewUrls = useMemo(() => selectedVideos.map((file) => URL.createObjectURL(file)), [selectedVideos]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  useEffect(() => () => videoPreviewUrls.forEach((url) => URL.revokeObjectURL(url)), [videoPreviewUrls]);

  function addVideos(files: File[]) {
    const allowedTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
    const validFiles = files.filter((file) => allowedTypes.has(file.type));
    const oversized = validFiles.find((file) => file.size > 60 * 1024 * 1024);
    if (oversized) {
      setVideoUploadMessage(`${oversized.name} is ${formatFileSize(oversized.size)}. Product videos must be 60 MB or smaller.`);
      return;
    }
    if (validFiles.length !== files.length) {
      setVideoUploadMessage("Product videos must be MP4, WebM, or MOV files.");
      return;
    }
    const nextVideos = validFiles.slice(0, 1);
    setSelectedVideos(nextVideos);
    if (videoInputRef.current) {
      const transfer = new DataTransfer();
      nextVideos.forEach((file) => transfer.items.add(file));
      videoInputRef.current.files = transfer.files;
    }
    setVideoUploadMessage(validFiles.length > 1 ? "Please upload one product video at a time." : "");
  }

  function removeVideo(indexToRemove: number) {
    const nextVideos = selectedVideos.filter((_, index) => index !== indexToRemove);
    setSelectedVideos(nextVideos);
    if (videoInputRef.current) {
      const transfer = new DataTransfer();
      nextVideos.forEach((file) => transfer.items.add(file));
      videoInputRef.current.files = transfer.files;
    }
  }

  function syncInputFiles(files: File[]) {
    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      files.forEach((file) => dataTransfer.items.add(file));
      fileInputRef.current.files = dataTransfer.files;
    }

    selectedFilesRef.current = files;
    setSelectedFiles(files);
  }

  async function addFiles(files: File[]) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const oversizedFile = imageFiles.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    const availableSlots = MAX_IMAGES - selectedFilesRef.current.length;

    if (oversizedFile) {
      setImageUploadMessage(
        `${oversizedFile.name} is ${formatFileSize(oversizedFile.size)}. Product images must be ${MAX_IMAGE_SIZE_MB} MB or smaller.`,
      );
      return;
    }

    if (availableSlots <= 0) {
      setImageUploadMessage(`You can upload up to ${MAX_IMAGES} images.`);
      return;
    }

    setIsCompressingImages(true);
    setImageUploadMessage("");

    try {
      const compressedFiles = await Promise.all(imageFiles.slice(0, availableSlots).map((file) => compressImageFile(file)));
      const nextFiles = [...selectedFilesRef.current, ...compressedFiles].filter(
        (file, index, allFiles) =>
          index ===
          allFiles.findIndex(
            (candidate) =>
              candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified,
          ),
      );

      syncInputFiles(nextFiles.slice(0, MAX_IMAGES));

      const compressedCount = compressedFiles.filter((file, index) => file !== imageFiles[index]).length;
      const skippedCount = imageFiles.length - compressedFiles.length;

      if (compressedCount || skippedCount) {
        setImageUploadMessage(
          [
            compressedCount ? `${compressedCount} image${compressedCount === 1 ? "" : "s"} compressed before upload.` : "",
            skippedCount ? `${skippedCount} image${skippedCount === 1 ? "" : "s"} skipped because the limit is ${MAX_IMAGES}.` : "",
          ]
            .filter(Boolean)
            .join(" "),
        );
      }
    } catch (error) {
      setImageUploadMessage(error instanceof Error ? error.message : "Unable to compress the selected image.");
    } finally {
      setIsCompressingImages(false);
    }
  }

  function removeFile(indexToRemove: number) {
    syncInputFiles(selectedFilesRef.current.filter((_, index) => index !== indexToRemove));
  }

  function reorderFiles(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) {
      setDraggedPreviewIndex(null);
      return;
    }

    const nextFiles = [...selectedFilesRef.current];
    const [movedFile] = nextFiles.splice(fromIndex, 1);
    nextFiles.splice(toIndex, 0, movedFile);
    syncInputFiles(nextFiles);
    setDraggedPreviewIndex(null);
  }

  function removeCurrentImage(imageId: string) {
    setDeletedImageIds((imageIds) => (imageIds.includes(imageId) ? imageIds : [...imageIds, imageId]));
    setCurrentImages((images) => images.filter((image) => image.id !== imageId));
  }

  function reorderCurrentImages(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) {
      setDraggedCurrentImageIndex(null);
      return;
    }

    const nextImages = [...currentImages];
    const [movedImage] = nextImages.splice(fromIndex, 1);
    nextImages.splice(toIndex, 0, movedImage);
    setCurrentImages(nextImages);
    setDraggedCurrentImageIndex(null);
  }

  return (
    <form
      action={action}
      className="admin-product-form"
      onSubmit={(event) => {
        if (isCompressingImages) {
          event.preventDefault();
          setImageUploadMessage("Please wait for image compression to finish before saving.");
        }
      }}
    >
      {currentImages.map((image) => (
        <input key={image.id} name="existing_image_order" type="hidden" value={image.id} />
      ))}
      {deletedImageIds.map((imageId) => (
        <input key={imageId} name="deleted_image_ids" type="hidden" value={imageId} />
      ))}

      <div className="admin-form-grid">
        <label>
          Product Name
          <input
            name="name"
            required
            value={productName}
            onChange={(event) => {
              const nextName = event.currentTarget.value;
              setProductName(nextName);

              if (!isSlugManuallyEdited) {
                setSlug(slugify(nextName));
              }
            }}
          />
        </label>
        <label>
          Slug
          <input
            name="slug"
            placeholder="auto-filled from product name"
            value={slug}
            onBlur={() => setSlug(slugify(slug || productName))}
            onChange={(event) => {
              const nextSlug = event.currentTarget.value;
              setSlug(nextSlug);
              setIsSlugManuallyEdited(nextSlug.trim().length > 0);
            }}
          />
        </label>
        <label>
          Regular Price
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
          Member Price
          <input
            name="member_price"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={product ? (product.memberPriceCents / 100).toFixed(2) : ""}
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
          NUC Points
          <input
            name="nuc_points"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product ? product.nucPoints.toFixed(2) : "0.00"}
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

      {currentImages.length ? (
        <div className="admin-current-images">
          <span>Saved Images</span>
          <div className="admin-image-preview-grid">
            {currentImages.map((image, index) => (
              <div
                className={draggedCurrentImageIndex === index ? "admin-image-preview dragging" : "admin-image-preview"}
                draggable
                key={image.id}
                onDragStart={(event) => {
                  setDraggedCurrentImageIndex(index);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(index));
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDragEnd={() => setDraggedCurrentImageIndex(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromIndex = Number.parseInt(event.dataTransfer.getData("text/plain"), 10);

                  if (Number.isFinite(fromIndex)) {
                    reorderCurrentImages(fromIndex, index);
                  }
                }}
              >
                {image.mediaType === "video" ? (
                  <video className="admin-image-preview-thumb admin-video-preview" src={image.imageUrl} muted playsInline preload="metadata" />
                ) : (
                  <span className="admin-image-preview-thumb" style={{ backgroundImage: `url(${image.imageUrl})` }} role="img" aria-label={image.altText ?? productName} />
                )}
                <small className="admin-image-primary-badge">{image.mediaType === "video" ? "Video" : index === 0 ? "Hero" : "Image"}</small>
                <button
                  className="admin-image-remove"
                  aria-label={`Remove ${image.altText ?? productName}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeCurrentImage(image.id);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <label
        className={isDragging ? "admin-image-dropzone dragging" : "admin-image-dropzone"}
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
          onChange={(event) => {
            void addFiles(Array.from(event.currentTarget.files ?? []));
            event.currentTarget.value = "";
          }}
        />
        <strong>{isCompressingImages ? "Compressing images..." : "Drop product images here"}</strong>
        <span>or click to upload up to {MAX_IMAGES} images, {MAX_IMAGE_SIZE_MB} MB each</span>
      </label>

      {imageUploadMessage ? <p className="admin-image-upload-message">{imageUploadMessage}</p> : null}

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

      <label className="admin-image-dropzone">
        <input
          ref={videoInputRef}
          className="admin-file-input"
          name="videos"
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mov"
          onChange={(event) => addVideos(Array.from(event.currentTarget.files ?? []))}
        />
        <strong>Drop product videos here</strong>
        <span>or click to upload MP4, WebM, or MOV videos, up to 60 MB each</span>
      </label>
      {videoUploadMessage ? <p className="admin-image-upload-message">{videoUploadMessage}</p> : null}
      {selectedVideos.length ? (
        <div className="admin-image-preview-grid">
          {selectedVideos.map((file, index) => (
            <div className="admin-image-preview" key={`${file.name}-${file.size}-${file.lastModified}`}>
              <video className="admin-image-preview-thumb admin-video-preview" src={videoPreviewUrls[index]} muted playsInline preload="metadata" />
              <small className="admin-image-primary-badge">Video</small>
              <button className="admin-image-remove" aria-label={`Remove ${file.name}`} type="button" onClick={() => removeVideo(index)} />
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
        <button className="admin-btn" type="submit" disabled={isCompressingImages}>
          {mode === "create" ? "Create Product" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
