import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getSupabaseCredentials() {
  const defaultUrl = "https://tigcnyawfhcxcdjqdfaf.supabase.co";
  const defaultKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZ2NueWF3ZmhjeGNkanFkZmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNjY3MDksImV4cCI6MjA5OTg0MjcwOX0.Zt0-yT0RHcjzVsuC1ngohpU1SJfX8O1RtRafosEFZvc";

  // @ts-ignore
  const envUrl = import.meta.env?.VITE_SUPABASE_URL || '';
  // @ts-ignore
  const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
  
  const localUrl = localStorage.getItem('ea_supabase_url') || '';
  const localKey = localStorage.getItem('ea_supabase_anon_key') || '';

  const url = localUrl || envUrl || defaultUrl;
  const key = localKey || envKey || defaultKey;

  return { url, key };
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

function getClientInstance(): SupabaseClient {
  const { url, key } = getSupabaseCredentials();
  if (!cachedClient || url !== lastUrl || key !== lastKey) {
    cachedClient = createClient(url, key);
    lastUrl = url;
    lastKey = key;
  }
  return cachedClient;
}

export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getClientInstance();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
}) as SupabaseClient;
