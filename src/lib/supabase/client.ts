import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Browser-side Supabase client.
//
// Uses @supabase/ssr's createBrowserClient, NOT supabase-js' createClient.
// The difference matters: createBrowserClient stores the session in COOKIES
// rather than localStorage, which is the only way the Next.js Route Handlers
// in /api/v1 can see who is signed in. With localStorage the browser would be
// authenticated but every server route would read an anonymous request and
// RLS would deny everything.
//
// It also removes the `storage: localStorage` reference that used to run at
// module scope here, which threw the moment any server component imported it.
//
// Import like this:
//   import { supabase } from "@/lib/supabase/client";

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);
