import React, { useState } from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity, Modal } from 'react-native';
import { Container } from '@/components/Container';
import { Button } from '@/components/Button';
import { TestRunner } from '@/components/TestRunner';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/colors';
import { User, Settings, TestTube } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [showTestRunner, setShowTestRunner] = useState<boolean>(false);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              console.log('User signed out successfully');
              // AuthGuard will handle navigation automatically
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  return (
    <Container>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <User size={40} color={Colors.background} />
          </View>
          <Text style={styles.email}>{user?.email || 'User'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.menuItem}>
            <User size={20} color={Colors.gray[600]} />
            <Text style={styles.menuText}>Personal Information</Text>
          </View>
          
          <View style={styles.menuItem}>
            <Settings size={20} color={Colors.gray[600]} />
            <Text style={styles.menuText}>Settings</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer Tools</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setShowTestRunner(true)}
            testID="test-runner-button"
          >
            <TestTube size={20} color={Colors.primary} />
            <Text style={[styles.menuText, { color: Colors.primary }]}>Test Runner</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Button
            title="Sign Out"
            variant="outline"
            onPress={handleSignOut}
            style={styles.signOutButton}
            textStyle={styles.signOutButtonText}
            testID="signout-button"
          />
        </View>
        
        {/* Test Runner Modal */}
        <Modal
          visible={showTestRunner}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <TestRunner onClose={() => setShowTestRunner(false)} />
        </Modal>
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
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.gray[800],
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  menuText: {
    fontSize: 16,
    color: Colors.gray[700],
    marginLeft: 16,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  signOutButton: {
    width: '100%',
    borderColor: Colors.error,
  },
  signOutButtonText: {
    color: Colors.error,
  },
});