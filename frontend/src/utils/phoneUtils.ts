import { useState } from "react";

/**
 * Formats a phone number as the user types
 * Automatically adds formatting like (123) 456-7890
 */
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const phoneNumber = value.replace(/\D/g, '');
  
  // Limit to 10 digits for US/Canadian numbers
  const truncated = phoneNumber.slice(0, 10);
  
  // Format based on length
  if (truncated.length === 0) {
    return '';
  } else if (truncated.length <= 3) {
    return `(${truncated}`;
  } else if (truncated.length <= 6) {
    return `(${truncated.slice(0, 3)}) ${truncated.slice(3)}`;
  } else {
    return `(${truncated.slice(0, 3)}) ${truncated.slice(3, 6)}-${truncated.slice(6)}`;
  }
};

/**
 * Validates if a phone number is complete and valid
 * Returns true for valid 10-digit North American numbers
 */
export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Check for exactly 10 digits
  if (digits.length !== 10) {
    return false;
  }
  
  // Check that area code doesn't start with 0 or 1
  const areaCode = digits.slice(0, 3);
  if (areaCode[0] === '0' || areaCode[0] === '1') {
    return false;
  }
  
  // Check that exchange doesn't start with 0 or 1
  const exchange = digits.slice(3, 6);
  if (exchange[0] === '0' || exchange[0] === '1') {
    return false;
  }
  
  return true;
};

/**
 * Strips formatting from phone number to get just digits
 * Useful for storing in database or API calls
 */
export const stripPhoneFormatting = (phoneNumber: string): string => {
  return phoneNumber.replace(/\D/g, '');
};

/**
 * Formats a stored phone number for display
 * Converts "1234567890" to "(123) 456-7890"
 */
export const displayPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return '';
  
  const digits = phoneNumber.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Return original if not 10 digits
  return phoneNumber;
};

/**
 * International phone number formatting (basic)
 * Handles +1 prefix for North American numbers
 */
export const formatInternationalPhone = (value: string): string => {
  // Remove all non-digit characters except +
  const cleaned = value.replace(/[^\d+]/g, '');
  
  // Handle +1 prefix
  if (cleaned.startsWith('+1')) {
    const digits = cleaned.slice(2);
    if (digits.length === 0) {
      return '+1 ';
    } else if (digits.length <= 3) {
      return `+1 (${digits}`;
    } else if (digits.length <= 6) {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  }
  
  // Handle regular formatting
  return formatPhoneNumber(cleaned);
};

/**
 * React hook for phone number input handling
 */
export const usePhoneInput = (initialValue: string = '') => {
  const [value, setValue] = useState(initialValue);
  const [isValid, setIsValid] = useState(false);
  
  const handleChange = (inputValue: string) => {
    const formatted = formatPhoneNumber(inputValue);
    setValue(formatted);
    setIsValid(isValidPhoneNumber(formatted));
  };
  
  const getRawValue = () => stripPhoneFormatting(value);
  
  return {
    value,
    isValid,
    handleChange,
    getRawValue,
    setValue: (newValue: string) => {
      const formatted = displayPhoneNumber(newValue);
      setValue(formatted);
      setIsValid(isValidPhoneNumber(formatted));
    }
  };
};