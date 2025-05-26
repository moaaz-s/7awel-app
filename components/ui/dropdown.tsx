import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from './card';
import { Input } from './input';
import { Button } from './button';
import { ChevronDownIcon, CheckIcon, SearchIcon } from '@/components/icons';
import { useClickOutside } from '@/hooks/use-click-outside';
import { cn } from '@/lib/utils';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  searchable = false,
  searchPlaceholder = 'Search...',
  className,
  disabled = false,
  required = false
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useClickOutside(dropdownRef as React.RefObject<HTMLElement>, () => {
    setIsOpen(false);
    setSearchQuery('');
  });

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const filteredOptions = searchable
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full justify-between h-12 bg-gray-200 dark:bg-gray-800/60-200 border-none rounded-2xl",
          !selectedOption && "text-muted-foreground"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        withoutShadow
      >
        <div className='flex-1 flex items-center gap-2 justify-between'>
          <div className="flex items-center gap-4">
            {selectedOption?.icon}
            <span>{selectedOption?.label || placeholder}</span>
          </div>
          <ChevronDownIcon className="h-4 w-4" />
        </div>
      </Button>

      {isOpen && (
        <Card className="absolute z-50 top-14 w-full max-h-80 overflow-hidden">
          <CardContent className="p-0">
            {searchable && (
              <div className="sticky top-0 bg-card p-2 border-b">
                <Input
                  ref={searchInputRef}
                  icon={<SearchIcon />}
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            )}

            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="flex items-center w-full px-3 py-2 gap-2 hover:bg-accent text-left"
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                    {option.value === value && (
                      <CheckIcon className="h-4 w-4 ml-auto text-primary" />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No options found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
