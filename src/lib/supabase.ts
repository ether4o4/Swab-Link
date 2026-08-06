import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * True when both Supabase env vars are present. When false the app runs in
 * "local only" mode: data is stored in this browser and there is no live sync
 * across devices. This lets the app be used/tested before a cloud project is
 * wired up.
 */
export const isCloud = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isCloud
  ? createClient(url as string, anonKey as string, {
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null

/** Bucket that holds photos and signature images in cloud mode. */
export const PHOTO_BUCKET = 'work-order-photos'
