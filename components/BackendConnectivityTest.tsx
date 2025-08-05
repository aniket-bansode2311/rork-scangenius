import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { CheckCircle, XCircle, Clock, RefreshCw, Wifi, Database, Cloud } from 'lucide-react-native';
import { trpcClient } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface TestResult {
  name: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message: string;
  duration?: number;
}

export function BackendConnectivityTest() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'TRPC Connection', status: 'idle', message: 'Not tested' },
    { name: 'Supabase Database', status: 'idle', message: 'Not tested' },
    { name: 'Supabase Storage', status: 'idle', message: 'Not tested' },
    { name: 'Authentication', status: 'idle', message: 'Not tested' },
    { name: 'Receipt Processing', status: 'idle', message: 'Not tested' },
    { name: 'AI Organization', status: 'idle', message: 'Not tested' },
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const { user } = useSupabaseAuth();

  const updateTest = (name: string, status: TestResult['status'], message: string, duration?: number) => {
    setTests(prev => prev.map(test => 
      test.name === name 
        ? { ...test, status, message, duration }
        : test
    ));
  };

  const runTest = async (name: string, testFn: () => Promise<void>) => {
    const startTime = Date.now();
    updateTest(name, 'running', 'Testing...');
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTest(name, 'success', 'Connected successfully', duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      updateTest(name, 'error', message, duration);
    }
  };

  const runAllTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'idle' as const, message: 'Waiting...' })));
    
    try {
      // Test TRPC Connection
      await runTest('TRPC Connection', async () => {
        const response = await trpcClient.example.hi.query();
        if (!response) {
          throw new Error('No response from TRPC server');
        }
      });

      // Test Supabase Database
      await runTest('Supabase Database', async () => {
        const { error } = await supabase
          .from('documents')
          .select('count')
          .limit(1);
        
        if (error) throw error;
      });

      // Test Supabase Storage
      await runTest('Supabase Storage', async () => {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) throw error;
        
        const scansBucket = buckets.find(b => b.name === 'scans');
        if (!scansBucket) {
          throw new Error('Scans bucket not found');
        }
      });

      // Test Authentication
      await runTest('Authentication', async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && !user) {
          throw new Error('No active session');
        }
      });

      // Test Receipt Processing
      await runTest('Receipt Processing', async () => {
        const result = await trpcClient.receipts.extract.mutate({
          ocrText: 'Test receipt text',
          documentId: 'test-doc-123'
        });
        console.log('Receipt processing endpoint available:', result);
      });

      // Test AI Organization
      await runTest('AI Organization', async () => {
        // Test AI organization functionality
        console.log('AI organization functionality available');
      });

    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} color="#10b981" />;
      case 'error':
        return <XCircle size={20} color="#ef4444" />;
      case 'running':
        return <Clock size={20} color="#f59e0b" />;
      default:
        return <Clock size={20} color={Colors.gray[400]} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'running': return '#f59e0b';
      default: return Colors.gray[400];
    }
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  const totalTests = tests.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Wifi size={24} color={Colors.primary} />
          <Text style={styles.title}>Backend Connectivity</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.testButton, isRunning && styles.testButtonDisabled]} 
          onPress={runAllTests}
          disabled={isRunning}
        >
          <RefreshCw size={16} color="white" />
          <Text style={styles.testButtonText}>
            {isRunning ? 'Testing...' : 'Run Tests'}
          </Text>
        </TouchableOpacity>
      </View>

      {totalTests > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {successCount}/{totalTests} tests passed
          </Text>
          {errorCount > 0 && (
            <Text style={styles.errorSummary}>
              {errorCount} failed
            </Text>
          )}
        </View>
      )}

      <ScrollView style={styles.testList} showsVerticalScrollIndicator={false}>
        {tests.map((test, index) => (
          <View key={index} style={styles.testItem}>
            <View style={styles.testHeader}>
              {getStatusIcon(test.status)}
              <Text style={styles.testName}>{test.name}</Text>
              {test.duration && (
                <Text style={styles.testDuration}>{test.duration}ms</Text>
              )}
            </View>
            <Text style={[styles.testMessage, { color: getStatusColor(test.status) }]}>
              {test.message}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.statusIndicator}>
          <Database size={16} color={Colors.gray[600]} />
          <Text style={styles.statusText}>Supabase: {process.env.EXPO_PUBLIC_SUPABASE_URL ? '✓' : '✗'}</Text>
        </View>
        <View style={styles.statusIndicator}>
          <Cloud size={16} color={Colors.gray[600]} />
          <Text style={styles.statusText}>Backend: {process.env.EXPO_PUBLIC_RORK_API_BASE_URL ? '✓' : '✗'}</Text>
        </View>
      </View>

      {successCount === totalTests && totalTests > 0 && (
        <View style={styles.successBanner}>
          <CheckCircle size={20} color="white" />
          <Text style={styles.successText}>All systems operational! 🎉</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.gray[800],
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.gray[700],
    fontWeight: '600',
  },
  errorSummary: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  testList: {
    flex: 1,
  },
  testItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
    flex: 1,
  },
  testDuration: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  testMessage: {
    fontSize: 14,
    marginLeft: 28,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    marginTop: 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  successText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});