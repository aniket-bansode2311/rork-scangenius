import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Container } from '@/components/Container';
import { Colors } from '@/constants/colors';
import {
  Home,
  FileText,
  User,
  Camera,
  LogIn,
  UserPlus,
  CheckCircle,
  XCircle,
  Navigation
} from 'lucide-react-native';

type RouteTest = {
  name: string;
  path: string;
  description: string;
  icon: React.ReactNode;
  category: 'auth' | 'tabs' | 'modal' | 'stack';
  requiresAuth?: boolean;
};

const routes: RouteTest[] = [
  // Welcome & Auth Routes
  {
    name: 'Welcome',
    path: '/welcome',
    description: 'App welcome screen',
    icon: <Home size={20} color={Colors.primary} />,
    category: 'stack'
  },
  {
    name: 'Login',
    path: '/(auth)/login',
    description: 'User login screen',
    icon: <LogIn size={20} color={Colors.primary} />,
    category: 'auth'
  },
  {
    name: 'Signup',
    path: '/(auth)/signup',
    description: 'User registration screen',
    icon: <UserPlus size={20} color={Colors.primary} />,
    category: 'auth'
  },
  
  // Tab Routes
  {
    name: 'Home Tab',
    path: '/(tabs)/',
    description: 'Main home screen (index)',
    icon: <Home size={20} color={Colors.primary} />,
    category: 'tabs',
    requiresAuth: true
  },
  {
    name: 'Scans Tab',
    path: '/(tabs)/scans',
    description: 'My scans screen',
    icon: <FileText size={20} color={Colors.primary} />,
    category: 'tabs',
    requiresAuth: true
  },
  {
    name: 'Profile Tab',
    path: '/(tabs)/profile',
    description: 'User profile screen',
    icon: <User size={20} color={Colors.primary} />,
    category: 'tabs',
    requiresAuth: true
  },
  
  // Modal/Stack Routes
  {
    name: 'Camera',
    path: '/camera',
    description: 'Document camera screen',
    icon: <Camera size={20} color={Colors.primary} />,
    category: 'modal',
    requiresAuth: true
  },
  {
    name: 'Photo Preview',
    path: '/photo-preview',
    description: 'Photo preview and editing (requires params)',
    icon: <FileText size={20} color={Colors.primary} />,
    category: 'modal',
    requiresAuth: true
  },
  {
    name: 'Document Detail',
    path: '/document-detail',
    description: 'Document detail view (requires params)',
    icon: <FileText size={20} color={Colors.primary} />,
    category: 'modal',
    requiresAuth: true
  },
  {
    name: 'Modal',
    path: '/modal',
    description: 'Generic modal screen',
    icon: <Navigation size={20} color={Colors.primary} />,
    category: 'modal'
  }
];

export default function RoutingTestScreen() {
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'pending'>>({});
  const [currentTest, setCurrentTest] = useState<string | null>(null);


  const testRoute = async (route: RouteTest) => {
    setCurrentTest(route.path);
    setTestResults(prev => ({ ...prev, [route.path]: 'pending' }));

    try {
      // Special handling for routes that require parameters
      if (route.path === '/photo-preview') {
        router.push({
          pathname: '/photo-preview',
          params: {
            photoUri: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400',
            testMode: 'true'
          }
        });
      } else if (route.path === '/document-detail') {
        router.push({
          pathname: '/document-detail',
          params: {
            documentId: 'test-doc-123',
            testMode: 'true'
          }
        });
      } else {
        router.push(route.path as any);
      }
      
      // Mark as success after a short delay
      setTimeout(() => {
        setTestResults(prev => ({ ...prev, [route.path]: 'success' }));
        setCurrentTest(null);
      }, 1000);
      
    } catch (error) {
      console.error(`Route test failed for ${route.path}:`, error);
      setTestResults(prev => ({ ...prev, [route.path]: 'error' }));
      setCurrentTest(null);
      
      Alert.alert(
        'Route Test Failed',
        `Failed to navigate to ${route.name}\n\nError: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const testAllRoutes = async () => {
    Alert.alert(
      'Test All Routes',
      'This will navigate through all routes automatically. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Test',
          onPress: async () => {
            for (const route of routes) {
              await new Promise(resolve => {
                testRoute(route);
                setTimeout(resolve, 2000); // Wait 2 seconds between tests
              });
            }
          }
        }
      ]
    );
  };

  const clearResults = () => {
    setTestResults({});
    setCurrentTest(null);
  };

  const getStatusIcon = (path: string) => {
    const status = testResults[path];
    if (currentTest === path) {
      return <Text style={styles.statusPending}>⏳</Text>;
    }
    switch (status) {
      case 'success':
        return <CheckCircle size={16} color={Colors.success} />;
      case 'error':
        return <XCircle size={16} color={Colors.error} />;
      default:
        return <Text style={styles.statusUntested}>○</Text>;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'auth': return Colors.warning;
      case 'tabs': return Colors.primary;
      case 'modal': return Colors.success;
      case 'stack': return Colors.gray[600];
      default: return Colors.gray[400];
    }
  };

  const groupedRoutes = routes.reduce((acc, route) => {
    if (!acc[route.category]) {
      acc[route.category] = [];
    }
    acc[route.category].push(route);
    return acc;
  }, {} as Record<string, RouteTest[]>);

  return (
    <Container>
      <Stack.Screen options={{
        title: 'Routing Test',
        headerStyle: { backgroundColor: Colors.background },
        headerTitleStyle: { color: Colors.gray[800] }
      }} />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>App Routing Test</Text>
          <Text style={styles.subtitle}>
            Test all routes in your application to ensure proper navigation
          </Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.testAllButton]}
              onPress={testAllRoutes}
            >
              <Text style={styles.actionButtonText}>Test All Routes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={clearResults}
            >
              <Text style={[styles.actionButtonText, { color: Colors.gray[600] }]}>Clear Results</Text>
            </TouchableOpacity>
          </View>
        </View>

        {Object.entries(groupedRoutes).map(([category, categoryRoutes]) => (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View style={[
                styles.categoryIndicator,
                { backgroundColor: getCategoryColor(category) }
              ]} />
              <Text style={styles.categoryTitle}>
                {category.charAt(0).toUpperCase() + category.slice(1)} Routes
              </Text>
              <Text style={styles.categoryCount}>({categoryRoutes.length})</Text>
            </View>
            
            {categoryRoutes.map((route) => (
              <TouchableOpacity
                key={route.path}
                style={[
                  styles.routeCard,
                  currentTest === route.path && styles.routeCardTesting
                ]}
                onPress={() => testRoute(route)}
                disabled={currentTest === route.path}
              >
                <View style={styles.routeHeader}>
                  <View style={styles.routeInfo}>
                    {route.icon}
                    <View style={styles.routeText}>
                      <Text style={styles.routeName}>{route.name}</Text>
                      <Text style={styles.routePath}>{route.path}</Text>
                    </View>
                  </View>
                  {getStatusIcon(route.path)}
                </View>
                
                <Text style={styles.routeDescription}>{route.description}</Text>
                
                {route.requiresAuth && (
                  <View style={styles.authBadge}>
                    <Text style={styles.authBadgeText}>Requires Auth</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Platform: {Platform.OS} • Total Routes: {routes.length}
          </Text>
          <Text style={styles.footerNote}>
            Tap any route to test navigation. Some routes may require authentication or specific parameters.
          </Text>
        </View>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.gray[800],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray[600],
    lineHeight: 24,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  testAllButton: {
    backgroundColor: Colors.primary,
  },
  clearButton: {
    backgroundColor: Colors.gray[200],
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
  },
  categorySection: {
    marginTop: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  categoryIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.gray[800],
    flex: 1,
  },
  categoryCount: {
    fontSize: 14,
    color: Colors.gray[500],
    fontWeight: '500',
  },
  routeCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    shadowColor: Colors.gray[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  routeCardTesting: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeText: {
    marginLeft: 12,
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 2,
  },
  routePath: {
    fontSize: 12,
    color: Colors.gray[500],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  routeDescription: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 20,
    marginBottom: 8,
  },
  authBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.warning + '20',
    borderRadius: 12,
  },
  authBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.warning,
    textTransform: 'uppercase',
  },
  statusPending: {
    fontSize: 16,
  },
  statusUntested: {
    fontSize: 16,
    color: Colors.gray[400],
  },
  footer: {
    padding: 20,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  footerText: {
    fontSize: 12,
    color: Colors.gray[500],
    textAlign: 'center',
    marginBottom: 8,
  },
  footerNote: {
    fontSize: 12,
    color: Colors.gray[400],
    textAlign: 'center',
    lineHeight: 16,
  },
});