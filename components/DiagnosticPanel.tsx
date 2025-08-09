import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { initializeDatabase, testDatabaseColumns, refreshDatabaseSchema } from '@/lib/database-utils';
import { useAuth } from '@/context/AuthContext';

interface DiagnosticInfo {
  authStatus: 'loading' | 'authenticated' | 'unauthenticated';
  databaseStatus: 'untested' | 'testing' | 'connected' | 'failed';
  colorStatus: 'working' | 'error';
  trpcStatus: 'untested' | 'working' | 'error';
}

export function DiagnosticPanel() {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo>({
    authStatus: 'loading',
    databaseStatus: 'untested',
    colorStatus: 'working',
    trpcStatus: 'untested',
  });
  
  const { user, loading } = useAuth();

  useEffect(() => {
    // Update auth status
    if (loading) {
      setDiagnostics(prev => ({ ...prev, authStatus: 'loading' }));
    } else if (user) {
      setDiagnostics(prev => ({ ...prev, authStatus: 'authenticated' }));
    } else {
      setDiagnostics(prev => ({ ...prev, authStatus: 'unauthenticated' }));
    }
  }, [user, loading]);

  const runDatabaseTest = async () => {
    setDiagnostics(prev => ({ ...prev, databaseStatus: 'testing' }));
    
    try {
      const success = await initializeDatabase();
      setDiagnostics(prev => ({ 
        ...prev, 
        databaseStatus: success ? 'connected' : 'failed' 
      }));
    } catch (error) {
      console.error('Database test failed:', error);
      setDiagnostics(prev => ({ ...prev, databaseStatus: 'failed' }));
    }
  };

  const testColors = () => {
    try {
      // Test color access
      const testColor = Colors.primary;
      const testGrayColor = Colors.gray?.[500];
      
      if (testColor && testGrayColor) {
        setDiagnostics(prev => ({ ...prev, colorStatus: 'working' }));
      } else {
        setDiagnostics(prev => ({ ...prev, colorStatus: 'error' }));
      }
    } catch (error) {
      console.error('Color test failed:', error);
      setDiagnostics(prev => ({ ...prev, colorStatus: 'error' }));
    }
  };

  const refreshSchema = async () => {
    try {
      await refreshDatabaseSchema();
      await testDatabaseColumns();
    } catch (error) {
      console.error('Schema refresh failed:', error);
    }
  };

  useEffect(() => {
    testColors();
  }, []);

  if (!isVisible) {
    return (
      <TouchableOpacity 
        style={styles.toggleButton} 
        onPress={() => setIsVisible(true)}
      >
        <Text style={styles.toggleButtonText}>🔧</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>Diagnostics</Text>
          <TouchableOpacity onPress={() => setIsVisible(false)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Authentication</Text>
            <Text style={[styles.status, getStatusStyle(diagnostics.authStatus)]}>
              {diagnostics.authStatus.toUpperCase()}
            </Text>
            {user && <Text style={styles.detail}>User: {user.email}</Text>}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Database</Text>
            <Text style={[styles.status, getStatusStyle(diagnostics.databaseStatus)]}>
              {diagnostics.databaseStatus.toUpperCase()}
            </Text>
            <TouchableOpacity style={styles.testButton} onPress={runDatabaseTest}>
              <Text style={styles.testButtonText}>Test Database</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.testButton} onPress={refreshSchema}>
              <Text style={styles.testButtonText}>Refresh Schema</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Colors</Text>
            <Text style={[styles.status, getStatusStyle(diagnostics.colorStatus)]}>
              {diagnostics.colorStatus.toUpperCase()}
            </Text>
            <TouchableOpacity style={styles.testButton} onPress={testColors}>
              <Text style={styles.testButtonText}>Test Colors</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'working':
    case 'connected':
    case 'authenticated':
      return { color: Colors.success || '#00E096' };
    case 'error':
    case 'failed':
    case 'unauthenticated':
      return { color: Colors.error || '#FF3D71' };
    case 'loading':
    case 'testing':
      return { color: Colors.warning || '#FFAA00' };
    default:
      return { color: Colors.text || '#2E3A59' };
  }
}

const styles = StyleSheet.create({
  toggleButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary || '#3366FF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  toggleButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  panel: {
    backgroundColor: Colors.background || '#FFFFFF',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    minWidth: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border || '#E4E9F2',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text || '#2E3A59',
  },
  closeButton: {
    fontSize: 18,
    color: Colors.gray?.[500] || '#8F9BB3',
    padding: 4,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text || '#2E3A59',
    marginBottom: 8,
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  detail: {
    fontSize: 12,
    color: Colors.gray?.[500] || '#8F9BB3',
    marginBottom: 4,
  },
  testButton: {
    backgroundColor: Colors.card || '#F7F9FC',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  testButtonText: {
    fontSize: 12,
    color: Colors.primary || '#3366FF',
    textAlign: 'center',
  },
});