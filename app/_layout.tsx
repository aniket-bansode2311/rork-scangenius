import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/context/AuthContext";
import { DocumentEditingProvider } from "@/context/DocumentEditingContext";
import { AuthGuard } from "@/components/AuthGuard";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { trpc, trpcClient } from "@/lib/trpc";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DiagnosticPanel } from "@/components/DiagnosticPanel";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }} initialRouteName="welcome">
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="camera" options={{ headerShown: false }} />
      <Stack.Screen name="photo-preview" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <ErrorBoundary>
                <AuthProvider>
                  <ErrorBoundary>
                    <DocumentEditingProvider>
                      <ErrorBoundary>
                        <AuthGuard>
                          <RootLayoutNav />
                          <DiagnosticPanel />
                        </AuthGuard>
                      </ErrorBoundary>
                    </DocumentEditingProvider>
                  </ErrorBoundary>
                </AuthProvider>
              </ErrorBoundary>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}