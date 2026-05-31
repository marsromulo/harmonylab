"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";

const ADMIN_AVATAR_BUCKET = "admin-avatars";
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getSafeFileName(fileName: string) {
  const parts = fileName.split(".");
  const extension = parts.length > 1 ? `.${slugify(parts.pop() ?? "")}` : "";
  const baseName = slugify(parts.join(".") || "admin-avatar") || "admin-avatar";

  return `${baseName}${extension}`;
}

function getAvatarFile(formData: FormData) {
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Profile photo must be an image file.");
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    throw new Error("Profile photo must be 5MB or smaller.");
  }

  return file;
}

export async function updateAdminProfileAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const displayName = getString(formData, "display_name");

  if (!displayName) {
    throw new Error("Display name is required.");
  }

  const metadata = user.user_metadata ?? {};
  let avatarUrl = typeof metadata.avatar_url === "string" ? metadata.avatar_url : "";
  let avatarPath = typeof metadata.avatar_path === "string" ? metadata.avatar_path : "";
  const avatarFile = getAvatarFile(formData);

  if (avatarFile) {
    const storagePath = `${user.id}/${Date.now()}-${getSafeFileName(avatarFile.name)}`;
    const { error: uploadError } = await supabase.storage.from(ADMIN_AVATAR_BUCKET).upload(storagePath, avatarFile, {
      contentType: avatarFile.type,
      upsert: false,
    });

    if (uploadError) {
      throw new Error(`Unable to upload profile photo: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(ADMIN_AVATAR_BUCKET).getPublicUrl(storagePath);

    if (avatarPath) {
      await supabase.storage.from(ADMIN_AVATAR_BUCKET).remove([avatarPath]);
    }

    avatarUrl = publicUrl;
    avatarPath = storagePath;
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      ...metadata,
      avatar_path: avatarPath || null,
      avatar_url: avatarUrl || null,
      display_name: displayName,
    },
  });

  if (error) {
    throw new Error(`Unable to update admin profile: ${error.message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/profile");
  redirect("/admin/profile?updated=1");
}
