import React from 'react';

import { Box } from '@/components/ui/box';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const FREQUENCIES = [
  {
    label: 'Daily',
    value: '1 day',
  },
  {
    label: 'Weekly',
    value: '1 week',
  },
  {
    label: 'Monthly',
    value: '1 month',
  },
];

export interface FrequencySelectProps {
  disabled?: boolean;
  onChange?: (value: string) => void;
  required?: boolean;
  value?: string;
  label?: string;
}

export const SelectFrequency: React.FC<FrequencySelectProps> = ({
  disabled,
  onChange,
  value,
  required,
  label = 'Frequency',
}) => {
  return (
    <Box className="py-0 gap-0 text-center">
      <Label htmlFor="frequency" className="mb-1 block text-sm font-medium">
        {label}
      </Label>
      <Select required={required} value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="frequency" className="w-full">
          <SelectValue placeholder="Select frequency" />
        </SelectTrigger>
        <SelectContent>
          {FREQUENCIES.map((frequency) => (
            <SelectItem key={frequency.value} value={frequency.value}>
              {frequency.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Box>
  );
};
