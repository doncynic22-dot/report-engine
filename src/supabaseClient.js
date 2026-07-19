import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tigcnyawfhcxcdjqdfaf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZ2NueWF3ZmhjeGNkanFkZmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNjY3MDksImV4cCI6MjA5OTg0MjcwOX0.Zt0-yT0RHcjzVsuC1ngohpU1SJfX8O1RtRafosEFZvc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
