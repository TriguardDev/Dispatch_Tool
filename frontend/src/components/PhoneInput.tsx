// components/PhoneInput.tsx
import React, { useState, useEffect } from 'react';
import { formatPhoneNumber, isValidPhoneNumber, stripPhoneFormatting, displayPhoneNumber } from '../utils/phoneUtils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidityChange?: (isValid: boolean) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  international?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  onValidityChange,
  placeholder = "(123) 456-7890",
  required = false,
  disabled = false,
  className = "input",
  id,
  name,
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

  // Determine input styling based on validation state
  const getInputClassName = () => {
    let classes = className;
    
    if (touched) {
      if (displayValue && !isValid) {
        classes += ' border-red-500 focus:border-red-500 focus:ring-red-500';
      } else if (isValid) {
        classes += ' border-green-500 focus:border-green-500 focus:ring-green-500';
      }
    }
    
    return classes;
  };

  const showError = touched && displayValue && !isValid;
  const showSuccess = touched && isValid;

  return (
    <div className="relative">
      <input
        type="tel"
        id={id}
        name={name}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onPaste={handlePaste}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={getInputClassName()}
        maxLength={14} // (123) 456-7890 = 14 characters
        inputMode="tel"
        autoComplete="tel"
      />
      
      {/* Validation feedback */}
      {showError}
      
      {showSuccess && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <span className="text-green-500 text-sm">✓</span>
        </div>
      )}
      
      {/* Error message */}
      {showError && (
        <p className="mt-1 text-sm text-red-600">
          Please enter a valid 10-digit phone number
        </p>
      )}
      
      {/* Help text */}
      {!touched && !displayValue && (
        <p className="mt-1 text-xs text-gray-500">
          Format: (123) 456-7890 - formatting applied automatically
        </p>
      )}
    </div>
  );
}