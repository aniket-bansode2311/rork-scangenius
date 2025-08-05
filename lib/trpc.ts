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

// Only create TRPC client if base URL is configured
const createTRPCClient = () => {
  try {
    return trpc.createClient({
      links: [
        httpLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    });
  } catch (error) {
    console.error('Failed to create TRPC client:', error);
    // Return a mock client or handle gracefully
    throw new Error('TRPC client configuration failed. Please check your EXPO_PUBLIC_RORK_API_BASE_URL.');
  }
};

export const trpcClient = createTRPCClient();