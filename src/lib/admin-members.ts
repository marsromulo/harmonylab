import { requireAdmin } from "@/lib/admin-auth";

export type AdminMember = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  referralCode: string;
  createdAt: string;
  referredOrderCount: number;
  totalNucPoints: number;
};

type MemberRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  referral_code: string;
  created_at: string;
};

type ReferralOrderRow = {
  id: string;
  order_number: string;
  referral_code_entered: string | null;
  referral_owner_member_id: string | null;
  created_at: string;
};

type ReferralOrderItemRow = {
  order_id: string;
  product_id: string | null;
  quantity: number;
};

type ProductNucPointsRow = {
  id: string;
  nuc_points: number | string | null;
};

export type AdminMemberReferralOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  nucPoints: number;
};

const memberSelect = "id,first_name,last_name,phone,referral_code,created_at";

type AdminSupabaseClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

type MemberReferralTotals = {
  referralOrders: AdminMemberReferralOrder[];
  referredOrderCount: number;
  totalNucPoints: number;
};

function normalizeReferralCode(value: string | null) {
  return (value ?? "").trim().toUpperCase();
}

export function getAdminMemberName(member: Pick<AdminMember, "firstName" | "lastName">) {
  return [member.firstName, member.lastName].filter(Boolean).join(" ");
}

export function formatNucPoints(points: number) {
  return points.toLocaleString("en-HK", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

async function getMemberReferralTotals(supabase: AdminSupabaseClient, memberRows: MemberRow[]) {
  const totalsByMemberId = new Map<string, MemberReferralTotals>();

  for (const member of memberRows) {
    totalsByMemberId.set(member.id, {
      referralOrders: [],
      referredOrderCount: 0,
      totalNucPoints: 0,
    });
  }

  if (memberRows.length === 0) {
    return totalsByMemberId;
  }

  const [{ data: orders, error: ordersError }, { data: orderItems, error: orderItemsError }, { data: products, error: productsError }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id,order_number,referral_code_entered,referral_owner_member_id,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("order_items").select("order_id,product_id,quantity"),
      supabase.from("products").select("id,nuc_points"),
    ]);

  if (ordersError) {
    throw new Error(`Unable to load referral orders: ${ordersError.message}`);
  }

  if (orderItemsError) {
    throw new Error(`Unable to load referral order items: ${orderItemsError.message}`);
  }

  if (productsError) {
    throw new Error(`Unable to load product NUC points: ${productsError.message}`);
  }

  const memberById = new Map(memberRows.map((member) => [member.id, member]));
  const memberIdByReferralCode = new Map(memberRows.map((member) => [normalizeReferralCode(member.referral_code), member.id]));
  const productPointsById = new Map(
    ((products ?? []) as unknown as ProductNucPointsRow[]).map((product) => [product.id, Number(product.nuc_points ?? 0)]),
  );
  const itemsByOrderId = new Map<string, ReferralOrderItemRow[]>();

  for (const item of (orderItems ?? []) as unknown as ReferralOrderItemRow[]) {
    const items = itemsByOrderId.get(item.order_id) ?? [];
    items.push(item);
    itemsByOrderId.set(item.order_id, items);
  }

  for (const order of (orders ?? []) as unknown as ReferralOrderRow[]) {
    const ownerMemberId =
      order.referral_owner_member_id && memberById.has(order.referral_owner_member_id)
        ? order.referral_owner_member_id
        : memberIdByReferralCode.get(normalizeReferralCode(order.referral_code_entered));

    if (!ownerMemberId) {
      continue;
    }

    let orderNucPoints = 0;

    for (const item of itemsByOrderId.get(order.id) ?? []) {
      orderNucPoints += (productPointsById.get(item.product_id ?? "") ?? 0) * item.quantity;
    }

    const totals = totalsByMemberId.get(ownerMemberId);

    if (!totals) {
      continue;
    }

    totals.referredOrderCount += 1;
    totals.totalNucPoints += orderNucPoints;
    totals.referralOrders.push({
      id: order.id,
      orderNumber: order.order_number,
      createdAt: order.created_at,
      nucPoints: orderNucPoints,
    });
  }

  return totalsByMemberId;
}

export async function getAdminMembers() {
  const { supabase } = await requireAdmin();
  const { data: members, error: membersError } = await supabase
    .from("members")
    .select(memberSelect)
    .order("created_at", { ascending: false });

  if (membersError) {
    throw new Error(`Unable to load members: ${membersError.message}`);
  }

  const memberRows = (members ?? []) as unknown as MemberRow[];
  const totalsByMemberId = await getMemberReferralTotals(supabase, memberRows);

  return memberRows.map((member): AdminMember => ({
    id: member.id,
    firstName: member.first_name,
    lastName: member.last_name,
    phone: member.phone,
    referralCode: member.referral_code,
    createdAt: member.created_at,
    referredOrderCount: totalsByMemberId.get(member.id)?.referredOrderCount ?? 0,
    totalNucPoints: totalsByMemberId.get(member.id)?.totalNucPoints ?? 0,
  }));
}

export async function getAdminMemberDetails(memberId: string) {
  const { supabase } = await requireAdmin();
  const { data: member, error: memberError } = await supabase.from("members").select(memberSelect).eq("id", memberId).maybeSingle();

  if (memberError) {
    throw new Error(`Unable to load member: ${memberError.message}`);
  }

  if (!member) {
    return null;
  }

  const memberRow = member as unknown as MemberRow;
  const totals = (await getMemberReferralTotals(supabase, [memberRow])).get(memberRow.id);
  const referralOrders = totals?.referralOrders ?? [];

  return {
    member: {
      id: memberRow.id,
      firstName: memberRow.first_name,
      lastName: memberRow.last_name,
      phone: memberRow.phone,
      referralCode: memberRow.referral_code,
      createdAt: memberRow.created_at,
      referredOrderCount: totals?.referredOrderCount ?? 0,
      totalNucPoints: totals?.totalNucPoints ?? 0,
    },
    referralOrders,
  };
}
