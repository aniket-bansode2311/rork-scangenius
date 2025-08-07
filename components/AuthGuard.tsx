import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/colors';

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const isWelcome = segments[0] === 'welcome' || !segments[0];

    console.log('AuthGuard - User:', user?.email, 'Segments:', segments);

    // Use setTimeout to avoid state updates during render
    const handleNavigation = () => {
      if (!user) {
        // User is not authenticated
        if (inTabsGroup) {
          // Redirect to welcome if trying to access protected routes
          router.replace('/welcome');
        }
        // Allow access to welcome and auth screens
      } else {
        // User is authenticated
        if (inAuthGroup || isWelcome) {
          // Redirect to main app if trying to access auth screens
          router.replace('/(tabs)');
        }
        // Allow access to protected routes
      }
    };

    // Defer navigation to avoid state updates during render
    const timeoutId = setTimeout(handleNavigation, 0);
    
    return () => clearTimeout(timeoutId);
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});