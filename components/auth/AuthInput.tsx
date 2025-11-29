import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AuthInputProps extends Omit<TextInputProps, 'style'> {
  icon: keyof typeof Ionicons.glyphMap;
  showPasswordToggle?: boolean;
  isPasswordVisible?: boolean;
  onTogglePassword?: () => void;
}

export function AuthInput({
  icon,
  showPasswordToggle = false,
  isPasswordVisible = false,
  onTogglePassword,
  ...textInputProps
}: AuthInputProps) {
  return (
    <View style={styles.inputContainer}>
      <Ionicons name={icon} size={20} color="#999" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholderTextColor="#999"
        {...textInputProps}
      />
      {showPasswordToggle && onTogglePassword && (
        <TouchableOpacity onPress={onTogglePassword}>
          <Ionicons
            name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color="#999"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    height: 54,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
});

export default AuthInput;
