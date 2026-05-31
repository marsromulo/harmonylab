import { createSupabaseAuthServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  currency: string;
  imageUrl: string;
  images: StoreProductImage[];
  description: string | null;
  inventoryQuantity: number;
  isActive: boolean;
  sortOrder: number;
};

export type StoreProductImage = {
  id: string;
  imageUrl: string;
  storagePath: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

const fallbackProducts: StoreProduct[] = [
  {
    id: "fallback-vc-brighten-travel-kit",
    name: "VC Brighten Travel Kit",
    slug: "vc-brighten-travel-kit",
    priceCents: 36000,
    currency: "HKD",
    imageUrl: "/asset/featured-1.png",
    images: [],
    description: "Brightening skincare essentials for travel.",
    inventoryQuantity: 50,
    isActive: true,
    sortOrder: 10,
  },
  {
    id: "fallback-niacinamide-vc-serum",
    name: "Niacinamide VC Serum",
    slug: "niacinamide-vc-serum",
    priceCents: 22000,
    currency: "HKD",
    imageUrl: "/asset/featured-2.png",
    images: [],
    description: "Vitamin C serum for a clearer-looking glow.",
    inventoryQuantity: 75,
    isActive: true,
    sortOrder: 20,
  },
  {
    id: "fallback-vc-fresh-radiance-night-cream-set",
    name: "VC Fresh Radiance & Night Cream Set",
    slug: "vc-fresh-radiance-night-cream-set",
    priceCents: 32000,
    currency: "HKD",
    imageUrl: "/asset/featured-3.png",
    images: [],
    description: "Day-to-night care for radiant skin.",
    inventoryQuantity: 40,
    isActive: true,
    sortOrder: 30,
  },
  {
    id: "fallback-peptide-anti-wrinkle-serum",
    name: "Peptide Anti-Wrinkle Serum",
    slug: "peptide-anti-wrinkle-serum",
    priceCents: 21000,
    currency: "HKD",
    imageUrl: "/asset/featured-4.png",
    images: [],
    description: "Peptide serum for smoother-looking skin.",
    inventoryQuantity: 60,
    isActive: true,
    sortOrder: 40,
  },
];

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  currency: string;
  image_url: string | null;
  description: string | null;
  inventory_quantity: number;
  is_active: boolean;
  sort_order: number;
  product_images?: ProductImageRow[] | null;
};

type ProductImageRow = {
  id: string;
  image_url: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

const baseProductSelect =
  "id,name,slug,price_cents,currency,image_url,description,inventory_quantity,is_active,sort_order";
const productSelect =
  "id,name,slug,price_cents,currency,image_url,description,inventory_quantity,is_active,sort_order,product_images(id,image_url,storage_path,alt_text,sort_order,is_primary)";

export function formatProductPrice(product: Pick<StoreProduct, "currency" | "priceCents">) {
  const amount = product.priceCents / 100;

  if (product.currency === "HKD") {
    return `HK$ ${amount.toLocaleString("en-HK", { maximumFractionDigits: 0 })}`;
  }

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: product.currency,
  }).format(amount);
}

export function getProductDescriptionPreview(description: string | null) {
  if (!description) {
    return "";
  }

  const preview = description
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return preview.length > 130 ? `${preview.slice(0, 130).trimEnd()}...` : preview;
}

function mapProductImageRow(image: ProductImageRow): StoreProductImage {
  return {
    id: image.id,
    imageUrl: image.image_url,
    storagePath: image.storage_path,
    altText: image.alt_text,
    sortOrder: image.sort_order,
    isPrimary: image.is_primary,
  };
}

function mapProductRow(product: ProductRow): StoreProduct {
  const images = (product.product_images ?? [])
    .map(mapProductImageRow)
    .sort((current, next) => current.sortOrder - next.sortOrder);
  const primaryImage = images.find((image) => image.isPrimary) ?? images[0];

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    priceCents: product.price_cents,
    currency: product.currency,
    imageUrl: primaryImage?.imageUrl ?? product.image_url ?? "/asset/featured-1.png",
    images,
    description: product.description,
    inventoryQuantity: product.inventory_quantity,
    isActive: product.is_active,
    sortOrder: product.sort_order,
  };
}

export async function getProducts(limit = 100): Promise<StoreProduct[]> {
  try {
    const supabase = createSupabaseServerClient();
    const productsResult = await supabase
      .from("products")
      .select(productSelect)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(limit);
    let products = productsResult.data as ProductRow[] | null;
    let productsError = productsResult.error;

    if (productsError) {
      const retry = await supabase
        .from("products")
        .select(baseProductSelect)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(limit);

      products = retry.data as ProductRow[] | null;
      productsError = retry.error;
    }

    if (productsError) {
      console.warn("Supabase products query failed, using fallback products:", productsError.message);
      return fallbackProducts.slice(0, limit);
    }

    if (!products || products.length === 0) {
      return fallbackProducts.slice(0, limit);
    }

    return products.map(mapProductRow);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn("Unable to load Supabase products, using fallback products:", message);
    return fallbackProducts.slice(0, limit);
  }
}

export async function getFeaturedProducts(limit = 4): Promise<StoreProduct[]> {
  return getProducts(limit);
}

export async function getAdminProducts(limit = 100): Promise<StoreProduct[]> {
  const supabase = await createSupabaseAuthServerClient();
  const productsResult = await supabase
    .from("products")
    .select(productSelect)
    .order("sort_order", { ascending: true })
    .limit(limit);
  let products = productsResult.data as ProductRow[] | null;
  let productsError = productsResult.error;

  if (productsError) {
    const retry = await supabase
      .from("products")
      .select(baseProductSelect)
      .order("sort_order", { ascending: true })
      .limit(limit);

    products = retry.data as ProductRow[] | null;
    productsError = retry.error;
  }

  if (productsError) {
    throw new Error(`Unable to load admin products: ${productsError.message}`);
  }

  return (products ?? []).map(mapProductRow);
}

export async function getNextAdminProductSortOrder() {
  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Unable to load next product sort order: ${error.message}`);
  }

  return data?.[0]?.sort_order ? data[0].sort_order + 10 : 10;
}

export async function getAdminProductById(id: string): Promise<StoreProduct | null> {
  const supabase = await createSupabaseAuthServerClient();
  const productResult = await supabase
    .from("products")
    .select(productSelect)
    .eq("id", id)
    .maybeSingle();
  let product = productResult.data as ProductRow | null;
  let productError = productResult.error;

  if (productError) {
    const retry = await supabase.from("products").select(baseProductSelect).eq("id", id).maybeSingle();
    product = retry.data as ProductRow | null;
    productError = retry.error;
  }

  if (productError) {
    throw new Error(`Unable to load admin product: ${productError.message}`);
  }

  return product ? mapProductRow(product) : null;
}
