import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Container } from '@/components/Container';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/colors';
import { Scan, TestTube } from 'lucide-react-native';
import { router } from 'expo-router';

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <Container>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {user?.email?.split('@')[0] || 'User'}</Text>
          <Text style={styles.subGreeting}>What would you like to scan today?</Text>
        </View>

        <View style={styles.scanButtonContainer}>
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => router.push('/camera')}
            testID="scan-button"
          >
            <Scan size={48} color={Colors.background} />
          </TouchableOpacity>
          <Text style={styles.scanText}>Tap to Scan</Text>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/routing-test')}
            testID="routing-test-button"
          >
            <TestTube size={24} color={Colors.primary} />
            <Text style={styles.actionTitle}>Test Routing</Text>
            <Text style={styles.actionDescription}>Test all app routes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentScansContainer}>
          <Text style={styles.sectionTitle}>Recent Scans</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No recent scans</Text>
            <Text style={styles.emptyStateSubText}>Your recent scans will appear here</Text>
          </View>
        </View>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 40,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.gray[800],
    marginBottom: 8,
  },
  subGreeting: {
    fontSize: 16,
    color: Colors.gray[600],
  },
  scanButtonContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  scanButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 16,
  },
  scanText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[700],
  },
  recentScansContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.gray[800],
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: 12,
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 8,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
  },
  quickActions: {
    marginBottom: 32,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
    marginLeft: 12,
    flex: 1,
  },
  actionDescription: {
    fontSize: 12,
    color: Colors.gray[500],
    marginLeft: 12,
  },
});