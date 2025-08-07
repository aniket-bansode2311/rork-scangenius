import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  
  // If no base URL is configured, return a default or throw a more helpful error
  if (!baseUrl || baseUrl.trim() === '') {
    console.warn('EXPO_PUBLIC_RORK_API_BASE_URL is not configured. TRPC endpoints will not work.');
    // Return a placeholder URL to prevent initialization errors
    // In a real app, you might want to disable TRPC entirely or use a fallback URL
    return 'http://localhost:3000'; // Fallback for development
  }

  return baseUrl;
};

// Create TRPC client with better error handling
const createTRPCClient = () => {
  try {
    return trpc.createClient({
      links: [
        httpLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          // Add error handling for network issues
          fetch: (url, options) => {
            // Create timeout signal if AbortSignal.timeout is available
            let timeoutSignal;
            try {
              timeoutSignal = AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined;
            } catch {
              console.warn('AbortSignal.timeout not available, skipping timeout');
              timeoutSignal = undefined;
            }
            
            return fetch(url, {
              ...options,
              // Add timeout to prevent hanging requests if available
              ...(timeoutSignal && { signal: timeoutSignal }),
            }).catch((error) => {
              console.error('TRPC fetch error:', error);
              throw error;
            });
          },
        }),
      ],
    });
  } catch (error) {
    console.error('Failed to create TRPC client:', error);
    // Create a fallback client that always returns the same structure
    return trpc.createClient({
      links: [
        httpLink({
          url: 'http://localhost:3000/api/trpc', // Fallback URL
          transformer: superjson,
        }),
      ],
    });
  }
};

export const trpcClient = createTRPCClient();