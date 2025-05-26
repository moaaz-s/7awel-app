"use client";

import React, { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dropdown, DropdownOption } from '@/components/ui/dropdown';
import { useLanguage } from '@/context/LanguageContext';
import { User } from '@/types';
import { defaultCountries, CountryIso2, FlagImage } from 'react-international-phone';
import 'react-international-phone/style.css';
import { spacing } from '../ui-config';

interface ProfileStepProps {
  onSubmit: (data: Partial<User>) => void;
  error?: string;
  isLoading: boolean;
}

// Convert countries to dropdown options
const countryOptions: DropdownOption[] = defaultCountries.map(country => ({
  value: country[1], // iso2 code
  label: country[0], // country name
  icon: <FlagImage iso2={country[1] as CountryIso2} size={20} />
}));

// Generate day options (1-31)
const dayOptions: DropdownOption[] = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: String(i + 1)
}));

// Generate year options (last 100 years)
const currentYear = new Date().getFullYear();
const yearOptions: DropdownOption[] = Array.from({ length: 100 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i)
}));

export default function ProfileStep({ onSubmit, error, isLoading }: ProfileStepProps) {
  const { t } = useLanguage();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [gender, setGender] = useState('');
  
  // DOB fields
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');

  // Generate localized month options
  const monthOptions: DropdownOption[] = [
    { value: '01', label: t('common.months.january') },
    { value: '02', label: t('common.months.february') },
    { value: '03', label: t('common.months.march') },
    { value: '04', label: t('common.months.april') },
    { value: '05', label: t('common.months.may') },
    { value: '06', label: t('common.months.june') },
    { value: '07', label: t('common.months.july') },
    { value: '08', label: t('common.months.august') },
    { value: '09', label: t('common.months.september') },
    { value: '10', label: t('common.months.october') },
    { value: '11', label: t('common.months.november') },
    { value: '12', label: t('common.months.december') }
  ];

  // Generate localized gender options
  const genderOptions: DropdownOption[] = [
    { value: 'male', label: t('common.genderOptions.male') },
    { value: 'female', label: t('common.genderOptions.female') },
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // Combine DOB fields into single string (YYYY-MM-DD format)
    const dob = dobYear && dobMonth && dobDay ? `${dobYear}-${dobMonth}-${dobDay}` : '';
    
    onSubmit({ firstName, lastName, address, dob, country, gender });
  };

  return (
    <form onSubmit={handleSubmit} className={`flex-1 flex flex-col justify-between ${spacing.stack}`}>
      <div className={`flex flex-col ${spacing.stack_sm}`}>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        {/* First Name and Last Name on same line */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('common.firstName')}</label>
            <Input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
              placeholder={t('common.firstName')}
              onClear={() => setFirstName('')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('common.lastName')}</label>
            <Input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
              placeholder={t('common.lastName')}
              onClear={() => setLastName('')}
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('common.address')}</label>
          <Input
            value={address}
            onChange={e => setAddress(e.target.value)}
            required
            placeholder={t('common.address')}
            onClear={() => setAddress('')}
          />
        </div>

        {/* Country Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('common.country')}</label>
          <Dropdown
            options={countryOptions}
            value={country}
            onChange={setCountry}
            placeholder={t('common.country')}
            searchable
            searchPlaceholder={t('common.countryCodeSearch')}
            required
          />
        </div>

        {/* Date of Birth - 3 separate fields */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('common.dob')}</label>
          <div className="flex gap-2">
            <Dropdown
              options={dayOptions}
              value={dobDay}
              onChange={setDobDay}
              placeholder="Day"
              required
            />
            <Dropdown
              options={monthOptions}
              value={dobMonth}
              onChange={setDobMonth}
              placeholder="Month"
              className='flex-1'
              required
            />
            <Dropdown
              options={yearOptions}
              value={dobYear}
              onChange={setDobYear}
              placeholder="Year"
              required
            />
          </div>
        </div>

        {/* Gender Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('common.gender')}</label>
          <Dropdown
            options={genderOptions}
            value={gender}
            onChange={setGender}
            placeholder={t('common.gender')}
            required
          />
        </div>
      </div>
      
      <Button 
        type="submit" 
        variant="gradient"
        size="lg"
        fullWidth
        disabled={isLoading}
        isLoading={isLoading}
      >
        {t('common.continue')}
      </Button>
    </form>
  );
}
