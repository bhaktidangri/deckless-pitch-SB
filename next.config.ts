import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every buyer/vendor page is a "use client" component whose data comes
  // from its own useEffect poll against Supabase, not from Next's server
  // data-fetching — but the App Router's *client-side* Router Cache still
  // applies to the route segments themselves. Its default staleTime for
  // dynamic routes (~30s) meant navigating away and back within that window
  // could reuse the previously-rendered segment instead of remounting,
  // which silently froze a page's data mid-poll ("the data gets cached").
  // Setting this to 0 makes every buyer/vendor route always remount fresh
  // on navigation, so its poll loop actually restarts every time.
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
