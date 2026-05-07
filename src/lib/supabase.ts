/**
 * ============================================================================
 * SUPABASE CLIENT - Database and Storage Access
 * ============================================================================
 *
 * @module /lib/supabase
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Create client only if configured, otherwise use a placeholder
export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient("https://placeholder.supabase.co", "placeholder-key");

export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : supabase;

export const STORAGE_BUCKETS = { ATTACHMENTS: "ticket-attachments" } as const;

export function getAttachmentUrl(filename: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKETS.ATTACHMENTS}/${filename}`;
}

export async function createUploadUrl(filename: string): Promise<{ url: string; token: string } | null> {
  if (!supabaseServiceKey) return null;

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.ATTACHMENTS)
      .createSignedUploadUrl(filename);

    if (error) {
      console.error("Error creating upload URL:", error);
      return null;
    }

    return { url: data.signedUrl, token: data.token };
  } catch (error) {
    console.error("Error creating upload URL:", error);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}