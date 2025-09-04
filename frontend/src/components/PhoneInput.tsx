import React, { useState, useEffect } from 'react';
import { TextField, FormHelperText, Box, InputAdornment } from '@mui/material';
import { Check } from '@mui/icons-material';
import { formatPhoneNumber, isValidPhoneNumber, stripPhoneFormatting, displayPhoneNumber } from '../utils/phoneUtils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidityChange?: (isValid: boolean) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  label?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  international?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  onValidityChange,
  placeholder = "(123) 456-7890",
  required = false,
  disabled = false,
  id,
  name,
  label = "Phone",
  fullWidth = true,
  size = "medium",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  international = false
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [touched, setTouched] = useState(false);

  // Initialize display value from prop
  useEffect(() => {
    if (value && value !== stripPhoneFormatting(displayValue)) {
      const formatted = displayPhoneNumber(value);
      setDisplayValue(formatted);
      const valid = isValidPhoneNumber(formatted);
      setIsValid(valid);
      onValidityChange?.(valid);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatPhoneNumber(inputValue);
    const valid = isValidPhoneNumber(formatted);
    
    setDisplayValue(formatted);
    setIsValid(valid);
    
    // Call parent's onChange with raw digits for storage
    const rawValue = stripPhoneFormatting(formatted);
    onChange(rawValue);
    onValidityChange?.(valid);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const formatted = formatPhoneNumber(pastedData);
    const valid = isValidPhoneNumber(formatted);
    
    setDisplayValue(formatted);
    setIsValid(valid);
    setTouched(true);
    
    const rawValue = stripPhoneFormatting(formatted);
    onChange(rawValue);
    onValidityChange?.(valid);
  };

  const showError = touched && displayValue && !isValid;
  const showSuccess = touched && isValid;

  return (
    <Box>
      <TextField
        type="tel"
        id={id}
        name={name}
        label={label}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onPaste={handlePaste}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        fullWidth={fullWidth}
        size={size}
        error={!!showError}
        inputProps={{
          maxLength: 14, // (123) 456-7890 = 14 characters
          inputMode: 'tel',
          autoComplete: 'tel',
        }}
        InputProps={{
          endAdornment: showSuccess ? (
            <InputAdornment position="end">
              <Check color="success" fontSize="small" />
            </InputAdornment>
          ) : null,
        }}
      />
      
      {/* Error message */}
      {showError && (
        <FormHelperText error>
          Please enter a valid 10-digit phone number
        </FormHelperText>
      )}
      
      {/* Help text */}
      {!touched && !displayValue && (
        <FormHelperText>
          Format: (123) 456-7890 - formatting applied automatically
        </FormHelperText>
      )}
    </Box>
  );
}