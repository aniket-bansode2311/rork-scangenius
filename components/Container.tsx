import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

type ContainerProps = {
  children: ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
};

export function Container({ 
  children, 
  style, 
  scrollable = false,
  keyboardAvoiding = false
}: ContainerProps) {
  const content = (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );

  const scrollableContent = (
    <ScrollView 
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  );

  const renderContent = () => {
    if (keyboardAvoiding) {
      return (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          {scrollable ? scrollableContent : content}
        </KeyboardAvoidingView>
      );
    }
    
    return scrollable ? scrollableContent : content;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
});