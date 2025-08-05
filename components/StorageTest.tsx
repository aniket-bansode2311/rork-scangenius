import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { testSupabaseStorage } from '@/lib/supabase';

export const StorageTest: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>('');

  const runStorageTest = async () => {
    setTesting(true);
    setResult('Testing...');
    
    try {
      await testSupabaseStorage();
      setResult('✅ Storage test passed! Your Supabase storage is configured correctly.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult(`❌ Storage test failed: ${errorMessage}`);
      Alert.alert('Storage Test Failed', errorMessage);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Storage Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, testing && styles.buttonDisabled]} 
        onPress={runStorageTest}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test Storage Setup'}
        </Text>
      </TouchableOpacity>
      
      {result ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultContainer: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    maxWidth: '100%',
  },
  resultText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
