import { Input } from '@/components/ui/input';
import React from 'react';

import { Box } from '@/components/ui/box';
import { Label } from '@/components/ui/label';

export const DEFAULT_VALUE = '1.00';

export interface FrequencySelectProps {
  disabled?: boolean;
  onChange?: (value: string) => void;
  required?: boolean;
  value?: string;
  label?: string;
}

export const InputAmount: React.FC<FrequencySelectProps> = ({
  disabled,
  onChange,
  value,
  required,
  label,
}) => {
  return (
    <Box className="py-0 gap-0 text-center">
      {label && <Label className="mb-1 block text-sm font-medium">{label}</Label>}
      <Box className="flex flex-row items-center space-x-2">
        <Input
          required={required}
          className="text-center"
          type="number"
          step="0.01"
          min="0"
          placeholder="100.00"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
        />
        <span className="text-sm">USD</span>
      </Box>
    </Box>
  );
};
