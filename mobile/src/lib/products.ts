import { supabase } from '@/lib/supabase';

export type MobileProduct = {
  currency: string;
  description: string;
  id: string;
  imageUrl: string | null;
  inventoryQuantity: number;
  name: string;
  priceCents: number;
  slug: string;
};

type ProductRow = {
  currency: string;
  description: string | null;
  id: string;
  image_url: string | null;
  inventory_quantity: number;
  name: string;
  price_cents: number;
  slug: string;
};

const fallbackProducts: MobileProduct[] = [
  {
    currency: 'HKD',
    description: 'Brightening skincare essentials for travel.',
    id: 'fallback-vc-brighten-travel-kit',
    imageUrl: null,
    inventoryQuantity: 50,
    name: 'VC Brighten Travel Kit',
    priceCents: 36000,
    slug: 'vc-brighten-travel-kit',
  },
  {
    currency: 'HKD',
    description: 'Vitamin C serum for a clearer-looking glow.',
    id: 'fallback-niacinamide-vc-serum',
    imageUrl: null,
    inventoryQuantity: 75,
    name: 'Niacinamide VC Serum',
    priceCents: 22000,
    slug: 'niacinamide-vc-serum',
  },
  {
    currency: 'HKD',
    description: 'Day-to-night care for radiant skin.',
    id: 'fallback-vc-fresh-radiance-night-cream-set',
    imageUrl: null,
    inventoryQuantity: 40,
    name: 'VC Fresh Radiance & Night Cream Set',
    priceCents: 32000,
    slug: 'vc-fresh-radiance-night-cream-set',
  },
];

function stripHtml(value: string | null) {
  return (value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapProduct(row: ProductRow): MobileProduct {
  return {
    currency: row.currency,
    description: stripHtml(row.description),
    id: row.id,
    imageUrl: row.image_url?.startsWith('https://') ? row.image_url : null,
    inventoryQuantity: row.inventory_quantity,
    name: row.name,
    priceCents: row.price_cents,
    slug: row.slug,
  };
}

export function formatPrice(product: Pick<MobileProduct, 'currency' | 'priceCents'>) {
  if (product.currency === 'HKD') {
    return `HK$ ${(product.priceCents / 100).toLocaleString('en-HK', { maximumFractionDigits: 0 })}`;
  }

  return new Intl.NumberFormat('en', {
    currency: product.currency,
    style: 'currency',
  }).format(product.priceCents / 100);
}

export function getFallbackProductImage(slug: string) {
  if (slug.includes('cream')) {
    return require('@/assets/images/harmonylab/product-cream-set.jpg');
  }

  if (slug.includes('serum')) {
    return require('@/assets/images/harmonylab/product-travel-kit.jpg');
  }

  return require('@/assets/images/harmonylab/product-serum-kit.jpg');
}

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,slug,description,price_cents,currency,image_url,inventory_quantity')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) {
    return fallbackProducts;
  }

  return (data as ProductRow[]).map(mapProduct);
}

export async function getProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,slug,description,price_cents,currency,image_url,inventory_quantity')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return fallbackProducts.find((product) => product.slug === slug) ?? null;
  }

  return mapProduct(data as ProductRow);
}

export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select('id,name,slug,description,price_cents,currency,image_url,inventory_quantity')
    .in('id', ids)
    .eq('is_active', true);

  if (error) {
    return fallbackProducts.filter((product) => ids.includes(product.id));
  }

  return (data as ProductRow[]).map(mapProduct);
}
