import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { Stack, router } from 'expo-router';
import { Container } from '@/components/Container';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { Colors } from '@/constants/colors';

export default function WelcomeScreen() {
  const handleGetStarted = () => {
    router.replace('/(auth)/login');
  };

  return (
    <Container>
      <Stack.Screen options={{ 
        headerShown: false 
      }} />
      
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Logo size="large" />
        </View>
        
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1583521214690-73421a1829a9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Scan Anything, Anywhere</Text>
          <Text style={styles.description}>
            Transform your device into a powerful scanner. Capture, organize, and share documents with ease.
          </Text>
          
          <Button
            title="Get Started"
            onPress={handleGetStarted}
            style={styles.button}
            testID="get-started-button"
          />
        </View>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxHeight: 300,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.gray[800],
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: Colors.gray[600],
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    width: '100%',
    maxWidth: 300,
  },
});