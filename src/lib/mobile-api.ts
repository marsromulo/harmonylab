import type { User } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
};

export function mobileJson(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init?.headers,
    },
  });
}

export function mobileOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function getMobileUser(request: Request): Promise<
  | {
      response: Response;
      user?: never;
    }
  | {
      response?: never;
      user: User;
    }
> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return {
      response: mobileJson({ error: "Authentication is required." }, { status: 401 }),
    };
  }

  const supabase = createSupabaseServiceRoleClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      response: mobileJson({ error: "Your session is invalid or expired." }, { status: 401 }),
    };
  }

  return { user };
}

export function getRequiredString(value: unknown, maximumLength = 200) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maximumLength);
}

