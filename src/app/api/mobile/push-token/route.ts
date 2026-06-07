import { ensureCustomerProfile } from "@/lib/customers";
import { getMobileUser, getRequiredString, mobileJson, mobileOptions } from "@/lib/mobile-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export function OPTIONS() {
  return mobileOptions();
}

export async function POST(request: Request) {
  const auth = await getMobileUser(request);

  if (auth.response) {
    return auth.response;
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return mobileJson({ error: "Invalid push token data." }, { status: 400 });
  }

  const expoPushToken = getRequiredString(body.expoPushToken, 300);
  const deviceName = getRequiredString(body.deviceName, 200);
  const platform = getRequiredString(body.platform, 20);

  if (
    !/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(expoPushToken) ||
    !["android", "ios"].includes(platform)
  ) {
    return mobileJson({ error: "Invalid Expo push token." }, { status: 400 });
  }

  try {
    const profile = await ensureCustomerProfile(auth.user);
    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase.from("mobile_push_tokens").upsert(
      {
        customer_id: profile.id,
        device_name: deviceName || null,
        expo_push_token: expoPushToken,
        is_active: true,
        last_seen_at: new Date().toISOString(),
        platform,
      },
      { onConflict: "expo_push_token" },
    );

    if (error) {
      throw new Error(error.message);
    }

    return mobileJson({ registered: true });
  } catch (error) {
    console.error("Mobile push token registration failed:", error);
    return mobileJson({ error: "Unable to register this device for notifications." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await getMobileUser(request);

  if (auth.response) {
    return auth.response;
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return mobileJson({ error: "Invalid push token data." }, { status: 400 });
  }

  const expoPushToken = getRequiredString(body.expoPushToken, 300);

  try {
    const profile = await ensureCustomerProfile(auth.user);
    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase
      .from("mobile_push_tokens")
      .update({ is_active: false })
      .eq("customer_id", profile.id)
      .eq("expo_push_token", expoPushToken);

    if (error) {
      throw new Error(error.message);
    }

    return mobileJson({ registered: false });
  } catch (error) {
    console.error("Mobile push token removal failed:", error);
    return mobileJson({ error: "Unable to disable notifications for this device." }, { status: 500 });
  }
}
