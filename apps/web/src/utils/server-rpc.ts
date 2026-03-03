import { headers } from "next/headers";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

import type { AppRouterClient } from "@we-grow/api/routers/index";

/**
 * Create an oRPC client for use in server components and server actions.
 * This ensures cookies are properly forwarded from the server request to the API.
 */
export async function createServerCaller(): Promise<AppRouterClient> {
  const headersList = await headers();

  // Get the base URL from the request headers
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const host = headersList.get("host") || "localhost:3001";
  const baseUrl = `${protocol}://${host}`;

  const link = new RPCLink({
    url: `${baseUrl}/api/rpc`,
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          ...(options as RequestInit)?.headers,
          // Forward cookies from the server request to maintain session
          cookie: headersList.get("cookie") || "",
        },
      });
    },
  });

  return createORPCClient(link) as unknown as AppRouterClient;
}
