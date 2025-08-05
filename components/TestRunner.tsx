import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Play, CheckCircle, XCircle, Clock, Zap } from 'lucide-react-native';
import { testSuite, quickTests } from '@/tests/e2e-test-suite';

interface TestRunnerProps {
  onClose?: () => void;
}

export function TestRunner({ onClose }: TestRunnerProps) {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [quickTestResults, setQuickTestResults] = useState<Record<string, boolean | null>>({
    trpc: null,
    supabase: null,
    ocr: null,
    receipt: null
  });

  const addLog = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runFullTestSuite = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestResults([]);
    addLog('🚀 Starting comprehensive test suite...');
    
    try {
      // Override console.log to capture test output
      const originalLog = console.log;
      console.log = (message: string, ...args: any[]) => {
        addLog(message);
        originalLog(message, ...args);
      };
      
      await testSuite.runAllTests();
      
      // Restore console.log
      console.log = originalLog;
      
      addLog('✅ Test suite completed successfully!');
    } catch (error) {
      addLog(`❌ Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runQuickTest = async (testName: string, testFn: () => Promise<boolean>) => {
    setQuickTestResults(prev => ({ ...prev, [testName]: null }));
    
    try {
      const result = await testFn();
      setQuickTestResults(prev => ({ ...prev, [testName]: result }));
    } catch (error) {
      setQuickTestResults(prev => ({ ...prev, [testName]: false }));
      console.error(`Quick test ${testName} failed:`, error);
    }
  };

  const runAllQuickTests = async () => {
    await Promise.all([
      runQuickTest('trpc', quickTests.testTRPC),
      runQuickTest('supabase', quickTests.testSupabase),
      runQuickTest('ocr', quickTests.testOCR),
      runQuickTest('receipt', quickTests.testReceiptExtraction)
    ]);
  };

  const getQuickTestIcon = (result: boolean | null) => {
    if (result === null) return <Clock size={16} color={Colors.gray[400]} />;
    if (result === true) return <CheckCircle size={16} color="#10b981" />;
    return <XCircle size={16} color="#ef4444" />;
  };

  const getQuickTestColor = (result: boolean | null) => {
    if (result === null) return Colors.gray[400];
    if (result === true) return '#10b981';
    return '#ef4444';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Test Runner</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Tests Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Tests</Text>
        <Text style={styles.sectionDescription}>
          Test core functionality quickly
        </Text>
        
        <View style={styles.quickTestsContainer}>
          <TouchableOpacity
            style={styles.quickTestButton}
            onPress={() => runQuickTest('trpc', quickTests.testTRPC)}
            disabled={isRunning}
          >
            {getQuickTestIcon(quickTestResults.trpc)}
            <Text style={[styles.quickTestText, { color: getQuickTestColor(quickTestResults.trpc) }]}>
              TRPC
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTestButton}
            onPress={() => runQuickTest('supabase', quickTests.testSupabase)}
            disabled={isRunning}
          >
            {getQuickTestIcon(quickTestResults.supabase)}
            <Text style={[styles.quickTestText, { color: getQuickTestColor(quickTestResults.supabase) }]}>
              Supabase
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTestButton}
            onPress={() => runQuickTest('ocr', quickTests.testOCR)}
            disabled={isRunning}
          >
            {getQuickTestIcon(quickTestResults.ocr)}
            <Text style={[styles.quickTestText, { color: getQuickTestColor(quickTestResults.ocr) }]}>
              OCR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTestButton}
            onPress={() => runQuickTest('receipt', quickTests.testReceiptExtraction)}
            disabled={isRunning}
          >
            {getQuickTestIcon(quickTestResults.receipt)}
            <Text style={[styles.quickTestText, { color: getQuickTestColor(quickTestResults.receipt) }]}>
              Receipt
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.actionButton, styles.quickAllButton]}
          onPress={runAllQuickTests}
          disabled={isRunning}
        >
          <Zap size={16} color={Colors.background} />
          <Text style={styles.actionButtonText}>Run All Quick Tests</Text>
        </TouchableOpacity>
      </View>

      {/* Full Test Suite Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Full Test Suite</Text>
        <Text style={styles.sectionDescription}>
          Comprehensive end-to-end testing of all features
        </Text>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.fullTestButton, isRunning && styles.disabledButton]}
          onPress={runFullTestSuite}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <Play size={16} color={Colors.background} />
          )}
          <Text style={styles.actionButtonText}>
            {isRunning ? 'Running Tests...' : 'Run Full Test Suite'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Test Results */}
      {testResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Test Results</Text>
          <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
            {testResults.map((result, index) => (
              <Text key={index} style={styles.resultText}>
                {result}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📖 Instructions</Text>
        <Text style={styles.instructionText}>
          • Quick Tests: Test individual components rapidly{'\n'}
          • Full Suite: Comprehensive testing of all features{'\n'}
          • Check console for detailed logs{'\n'}
          • Ensure backend is running before testing
        </Text>
      </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.gray[800],
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.gray[600],
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.gray[800],
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.gray[600],
    marginBottom: 12,
  },
  quickTestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  quickTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    gap: 6,
    minWidth: 80,
  },
  quickTestText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  quickAllButton: {
    backgroundColor: Colors.primary,
  },
  fullTestButton: {
    backgroundColor: '#8b5cf6',
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  resultsContainer: {
    maxHeight: 200,
    backgroundColor: Colors.gray[50],
    borderRadius: 8,
    padding: 12,
  },
  resultText: {
    fontSize: 12,
    color: Colors.gray[700],
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 20,
  },
});