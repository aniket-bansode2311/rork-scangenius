import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TextInputProps,
  TouchableOpacity
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Eye, EyeOff } from 'lucide-react-native';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
};

export function Input({ 
  label, 
  error, 
  secureTextEntry = false,
  ...props 
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isSecure = secureTextEntry && !isPasswordVisible;

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            error ? styles.inputError : null,
            secureTextEntry ? styles.passwordInput : null
          ]}
          placeholderTextColor={Colors.gray[500]}
          secureTextEntry={isSecure}
          testID="input"
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={togglePasswordVisibility}
            testID="toggle-password"
          >
            {isPasswordVisible ? (
              <EyeOff size={20} color={Colors.gray[600]} />
            ) : (
              <Eye size={20} color={Colors.gray[600]} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: Colors.gray[700],
    fontWeight: '500',
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
  },
  input: {
    backgroundColor: Colors.gray[100],
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.gray[800],
    width: '100%',
  },
  passwordInput: {
    paddingRight: 50,
  },
  inputError: {
    borderColor: Colors.error,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },
});