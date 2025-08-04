import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Scan } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

type LogoProps = {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
};

export function Logo({ size = 'medium', showText = true }: LogoProps) {
  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 24;
      case 'medium':
        return 36;
      case 'large':
        return 48;
      default:
        return 36;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return styles.smallText;
      case 'medium':
        return styles.mediumText;
      case 'large':
        return styles.largeText;
      default:
        return styles.mediumText;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Scan size={getIconSize()} color={Colors.primary} />
      </View>
      {showText && (
        <Text style={[styles.text, getTextSize()]}>
          <Text style={styles.scan}>Scan</Text>
          <Text style={styles.genius}>Genius</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontWeight: 'bold',
  },
  smallText: {
    fontSize: 16,
  },
  mediumText: {
    fontSize: 24,
  },
  largeText: {
    fontSize: 32,
  },
  scan: {
    color: Colors.primary,
  },
  genius: {
    color: Colors.gray[700],
  },
});