"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";

const PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_IMAGES_PER_SUBMISSION = 8;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

type AdminSupabaseClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];
type ProductImageInsertRow = {
  product_id: string;
  image_url: string;
  storage_path: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
};

type ProductImageRecord = {
  id: string;
  image_url: string;
  storage_path: string | null;
};

const allowedDescriptionTags = new Set(["a", "b", "br", "em", "h3", "i", "li", "ol", "p", "strong", "u", "ul"]);

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getStrings(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
}

function getInteger(formData: FormData, key: string, fallback = 0) {
  const value = Number.parseInt(getString(formData, key), 10);
  return Number.isFinite(value) ? value : fallback;
}

function getPriceCents(formData: FormData) {
  const price = Number.parseFloat(getString(formData, "price"));

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Product price must be a valid positive number.");
  }

  return Math.round(price * 100);
}

function getDecimal(formData: FormData, key: string, fallback = 0) {
  const value = Number.parseFloat(getString(formData, key));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getSafeLinkHref(value: string) {
  const href = value.trim();

  if (/^(https?:|mailto:|tel:)/i.test(href)) {
    return href;
  }

  return "";
}

function sanitizeProductDescriptionHtml(html: string) {
  const cleaned = html
    .replace(/\r?\n/g, "<br>")
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*div[^>]*>/gi, "<p>")
    .replace(/<\s*\/\s*div\s*>/gi, "</p>")
    .replace(/<\/?span[^>]*>/gi, "");

  return cleaned.replace(/<[^>]+>/g, (tag) => {
    const closingMatch = tag.match(/^<\s*\/\s*([a-z0-9]+)/i);

    if (closingMatch) {
      const tagName = closingMatch[1].toLowerCase();
      return allowedDescriptionTags.has(tagName) && tagName !== "br" ? `</${tagName}>` : "";
    }

    const openingMatch = tag.match(/^<\s*([a-z0-9]+)/i);

    if (!openingMatch) {
      return "";
    }

    const tagName = openingMatch[1].toLowerCase();

    if (!allowedDescriptionTags.has(tagName)) {
      return "";
    }

    if (tagName === "br") {
      return "<br>";
    }

    if (tagName === "a") {
      const hrefMatch = tag.match(/\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const safeHref = getSafeLinkHref(hrefMatch?.[2] ?? hrefMatch?.[3] ?? hrefMatch?.[4] ?? "");

      return safeHref ? `<a href="${escapeAttribute(safeHref)}" target="_blank" rel="noopener noreferrer">` : "<a>";
    }

    return `<${tagName}>`;
  });
}

function getProductPayload(formData: FormData) {
  const name = getString(formData, "name");

  if (!name) {
    throw new Error("Product name is required.");
  }

  const rawSlug = getString(formData, "slug");
  const slug = slugify(rawSlug || name);

  if (!slug) {
    throw new Error("Product slug is required.");
  }

  return {
    name,
    slug,
    description: sanitizeProductDescriptionHtml(getString(formData, "description")) || null,
    price_cents: getPriceCents(formData),
    currency: getString(formData, "currency") || "HKD",
    image_url: getString(formData, "image_url") || null,
    inventory_quantity: Math.max(getInteger(formData, "inventory_quantity", 0), 0),
    is_active: formData.get("is_active") === "on",
    nuc_points: getDecimal(formData, "nuc_points", 0),
    sort_order: getInteger(formData, "sort_order", 0),
  };
}

function getImageFiles(formData: FormData) {
  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length > MAX_IMAGES_PER_SUBMISSION) {
    throw new Error(`Please upload ${MAX_IMAGES_PER_SUBMISSION} product images or fewer at a time.`);
  }

  files.forEach((file) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files can be uploaded.");
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error("Each product image must be 10MB or smaller.");
    }
  });

  return files;
}

function getSafeFileName(fileName: string) {
  const parts = fileName.split(".");
  const extension = parts.length > 1 ? `.${slugify(parts.pop() ?? "")}` : "";
  const baseName = slugify(parts.join(".") || "product-image") || "product-image";

  return `${baseName}${extension}`;
}

async function getNextImageSortOrder(supabase: AdminSupabaseClient, productId: string) {
  const { data, error } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Unable to inspect existing product images: ${error.message}`);
  }

  return data?.[0]?.sort_order ? data[0].sort_order + 10 : 10;
}

async function clearPrimaryProductImages(supabase: AdminSupabaseClient, productId: string) {
  const { error } = await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);

  if (error) {
    throw new Error(`Unable to update existing product images: ${error.message}`);
  }
}

async function uploadProductImages({
  supabase,
  productId,
  productName,
  files,
  startSortOrder,
  makeFirstPrimary,
}: {
  supabase: AdminSupabaseClient;
  productId: string;
  productName: string;
  files: File[];
  startSortOrder: number;
  makeFirstPrimary: boolean;
}) {
  if (files.length === 0) {
    return [];
  }

  if (makeFirstPrimary) {
    await clearPrimaryProductImages(supabase, productId);
  }

  const rows: ProductImageInsertRow[] = [];

  for (const [index, file] of files.entries()) {
    const storagePath = `products/${productId}/${Date.now()}-${index}-${getSafeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      throw new Error(`Unable to upload product image: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(storagePath);

    rows.push({
      product_id: productId,
      image_url: publicUrl,
      storage_path: storagePath,
      alt_text: productName,
      sort_order: startSortOrder + index * 10,
      is_primary: makeFirstPrimary && index === 0,
    });
  }

  const { error: insertError } = await supabase.from("product_images").insert(rows);

  if (insertError) {
    throw new Error(`Unable to save product image records: ${insertError.message}`);
  }

  return rows;
}

async function setProductImageUrl(supabase: AdminSupabaseClient, productId: string, imageUrl: string | null) {
  const { error } = await supabase.from("products").update({ image_url: imageUrl }).eq("id", productId);

  if (error) {
    throw new Error(`Unable to set product image URL: ${error.message}`);
  }
}

async function deleteProductStorageImages(supabase: AdminSupabaseClient, productId: string) {
  const { data, error } = await supabase.from("product_images").select("storage_path").eq("product_id", productId);

  if (error) {
    throw new Error(`Unable to load product images for deletion: ${error.message}`);
  }

  const storagePaths = (data ?? [])
    .map((image) => image.storage_path)
    .filter((storagePath): storagePath is string => Boolean(storagePath));

  if (storagePaths.length === 0) {
    return;
  }

  const { error: storageError } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(storagePaths);

  if (storageError) {
    throw new Error(`Unable to delete product image files: ${storageError.message}`);
  }
}

async function deleteSelectedProductImages({
  supabase,
  productId,
  imageIds,
}: {
  supabase: AdminSupabaseClient;
  productId: string;
  imageIds: string[];
}) {
  if (imageIds.length === 0) {
    return;
  }

  const { data, error } = await supabase
    .from("product_images")
    .select("id,storage_path")
    .eq("product_id", productId)
    .in("id", imageIds);

  if (error) {
    throw new Error(`Unable to load product images for deletion: ${error.message}`);
  }

  const storagePaths = (data ?? [])
    .map((image) => image.storage_path)
    .filter((storagePath): storagePath is string => Boolean(storagePath));

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(storagePaths);

    if (storageError) {
      throw new Error(`Unable to delete product image files: ${storageError.message}`);
    }
  }

  const recordIds = (data ?? []).map((image) => image.id);

  if (recordIds.length > 0) {
    const { error: deleteError } = await supabase.from("product_images").delete().eq("product_id", productId).in("id", recordIds);

    if (deleteError) {
      throw new Error(`Unable to delete product image records: ${deleteError.message}`);
    }
  }
}

async function syncExistingProductImageOrder({
  supabase,
  productId,
  orderedImageIds,
}: {
  supabase: AdminSupabaseClient;
  productId: string;
  orderedImageIds: string[];
}) {
  const uniqueOrderedImageIds = [...new Set(orderedImageIds)];

  if (uniqueOrderedImageIds.length === 0) {
    await clearPrimaryProductImages(supabase, productId);
    return null;
  }

  const { data, error } = await supabase
    .from("product_images")
    .select("id,image_url,storage_path")
    .eq("product_id", productId)
    .in("id", uniqueOrderedImageIds);

  if (error) {
    throw new Error(`Unable to load product images for ordering: ${error.message}`);
  }

  const imagesById = new Map((data as ProductImageRecord[] | null)?.map((image) => [image.id, image]) ?? []);
  const existingOrderedImages = uniqueOrderedImageIds
    .map((imageId) => imagesById.get(imageId))
    .filter((image): image is ProductImageRecord => Boolean(image));

  await clearPrimaryProductImages(supabase, productId);

  for (const [index, image] of existingOrderedImages.entries()) {
    const { error: updateError } = await supabase
      .from("product_images")
      .update({
        is_primary: index === 0,
        sort_order: (index + 1) * 10,
      })
      .eq("product_id", productId)
      .eq("id", image.id);

    if (updateError) {
      throw new Error(`Unable to update product image order: ${updateError.message}`);
    }
  }

  return existingOrderedImages[0] ?? null;
}

export async function createProductAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const payload = getProductPayload(formData);
  const imageFiles = getImageFiles(formData);
  const { data, error } = await supabase.from("products").insert(payload).select("id").single();

  if (error) {
    throw new Error(`Unable to create product: ${error.message}`);
  }

  const uploadedImages = await uploadProductImages({
    supabase,
    productId: data.id,
    productName: payload.name,
    files: imageFiles,
    startSortOrder: 10,
    makeFirstPrimary: imageFiles.length > 0,
  });

  if (uploadedImages[0]?.image_url) {
    await setProductImageUrl(supabase, data.id, uploadedImages[0].image_url);
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function deleteProductAction(id: string) {
  const { supabase } = await requireAdmin();

  await deleteProductStorageImages(supabase, id);

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    throw new Error(`Unable to delete product: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProductAction(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const payload = getProductPayload(formData);
  const imageFiles = getImageFiles(formData);
  const deletedImageIds = getStrings(formData, "deleted_image_ids");
  const orderedExistingImageIds = getStrings(formData, "existing_image_order").filter(
    (imageId) => !deletedImageIds.includes(imageId),
  );
  const { error } = await supabase.from("products").update(payload).eq("id", id);

  if (error) {
    throw new Error(`Unable to update product: ${error.message}`);
  }

  await deleteSelectedProductImages({
    supabase,
    productId: id,
    imageIds: deletedImageIds,
  });

  const primaryExistingImage = await syncExistingProductImageOrder({
    supabase,
    productId: id,
    orderedImageIds: orderedExistingImageIds,
  });

  const nextImageSortOrder = imageFiles.length > 0 ? await getNextImageSortOrder(supabase, id) : 10;
  const uploadedImages = await uploadProductImages({
    supabase,
    productId: id,
    productName: payload.name,
    files: imageFiles,
    startSortOrder: nextImageSortOrder,
    makeFirstPrimary: !primaryExistingImage && imageFiles.length > 0,
  });

  if (primaryExistingImage?.image_url) {
    await setProductImageUrl(supabase, id, primaryExistingImage.image_url);
  } else if (uploadedImages[0]?.image_url) {
    await setProductImageUrl(supabase, id, uploadedImages[0].image_url);
  } else if (deletedImageIds.length > 0) {
    await setProductImageUrl(supabase, id, null);
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/products");
  redirect("/admin/products");
}
