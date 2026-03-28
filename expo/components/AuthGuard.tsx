import React, { useEffect, useRef } from 'react';
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
  const navigationHandled = useRef(false);

  useEffect(() => {
    if (loading) {
      navigationHandled.current = false;
      return;
    }

    // Prevent multiple navigation attempts
    if (navigationHandled.current) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const isWelcome = segments[0] === 'welcome' || !segments[0];

    console.log('AuthGuard - User:', user?.email, 'Segments:', segments);

    // Use requestAnimationFrame to ensure navigation happens after render
    const handleNavigation = () => {
      try {
        if (!user) {
          // User is not authenticated
          if (inTabsGroup) {
            // Redirect to welcome if trying to access protected routes
            router.replace('/welcome');
            navigationHandled.current = true;
          }
          // Allow access to welcome and auth screens
        } else {
          // User is authenticated
          if (inAuthGroup || isWelcome) {
            // Redirect to main app if trying to access auth screens
            router.replace('/(tabs)');
            navigationHandled.current = true;
          }
          // Allow access to protected routes
        }
      } catch (error) {
        console.error('Navigation error in AuthGuard:', error);
      }
    };

    // Use requestAnimationFrame to defer navigation
    const frameId = requestAnimationFrame(handleNavigation);
    
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary || '#3366FF'} />
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