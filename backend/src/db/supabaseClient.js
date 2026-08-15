import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

// Service role key — backend only, never expose to the frontend.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
