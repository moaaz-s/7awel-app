"use client"

import { useRef, useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { useClickOutside } from '@/hooks/use-click-outside'
import { SearchIcon, CheckIcon, ChevronDownIcon } from '@/components/icons'
import { WhatsAppIcon, TelegramIcon } from '@/components/icons/ui-icons'
import { toast } from '@/hooks/use-toast'
import {
  CountryIso2,
  defaultCountries,
  FlagImage
} from 'react-international-phone'
import 'react-international-phone/style.css'
import Image from 'next/image'
import { useLanguage } from '@/context/LanguageContext'
import { OtpChannel } from '@/services/api-service';

// Enhanced country item type
interface CountryItem {
  name: string;
  iso2: CountryIso2;
  dialCode: string;
}

// Convert library countries to our format
const formattedCountries: CountryItem[] = defaultCountries.map(country => ({
  name: ['ae', 'sa', 'us', 'za'].includes(country[1])
    ? country[1] === 'ae' ? 'UAE'
      : country[1] === 'sa' ? 'KSA'
        : country[1] === 'us' ? 'USA'
          : country[1] === 'za' ? 'RSA'
            : country[1]
    : country[0],
  iso2: country[1] as CountryIso2,
  dialCode: country[2]
})).filter(country => country.name.length <= 10);

// Add Syria if it's not already in the list
const syriaExists = formattedCountries.some(country => country.iso2 === 'sy');
if (!syriaExists) {
  formattedCountries.push({
    name: "Syria",
    iso2: "sy" as CountryIso2,
    dialCode: "+963"
  });
}

// Function to get flag component based on country iso2
const getCountryFlag = (iso2: CountryIso2) => {
  // Special case for Syria
  if (iso2 === 'sy') {
    return (
      <Image
        src="/flag-syria.png"
        alt="Syria"
        width={20}
        height={15}
        className="rounded-[2px]"
      />
    );
  }

  // Use the library's flag component for all other countries
  return <FlagImage iso2={iso2} className="" />;
};

interface PhoneInputProps {
  defaultCountryCode?: string
  defaultPhoneNumber?: string
  onSubmit: (phone: string, channel: OtpChannel) => void
  error?: string
  isLoading?: boolean
}

export function PhoneInput({
  defaultCountryCode = "+1",
  defaultPhoneNumber = "",
  onSubmit,
  error,
  isLoading = false
}: PhoneInputProps) {
  const { t } = useLanguage()

  const [showCountryList, setShowCountryList] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<CountryIso2>('us')
  const [selectedCountryDialCode, setSelectedCountryDialCode] = useState(defaultCountryCode)
  const [phoneValue, setPhoneValue] = useState(defaultPhoneNumber)
  const [channel, setChannel] = useState<OtpChannel>(OtpChannel.WHATSAPP);

  const countryListRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const initializedRef = useRef(false)

  // Initialize phone and country code from defaultPhoneNumber when component mounts
  useEffect(() => {
    if (initializedRef.current) return;
    
    if (defaultPhoneNumber && defaultPhoneNumber.trim() !== '') {
      // Extract country code and national number from defaultPhoneNumber
      // The regex needs to match the country code part more accurately
      const phoneRegex = /^\+(\d+)(\d+)$/;
      const match = defaultPhoneNumber.match(phoneRegex);
      
      if (match) {
        let dialCode = `+${match[1]}`;
        let nationalNumber = match[2];
        
        // Find the largest possible dialCode that matches a country
        for (let i = match[1].length; i > 0; i--) {
          const testDialCode = `+${match[1].substring(0, i)}`;
          const country = formattedCountries.find(c => c.dialCode === testDialCode);
          
          if (country) {
            dialCode = testDialCode;
            nationalNumber = match[1].substring(i) + match[2];
            setSelectedCountry(country.iso2);
            setSelectedCountryDialCode(dialCode);
            setPhoneValue(nationalNumber); // Set only the national part
            break;
          }
        }
        
        if (dialCode === `+${match[1]}`) {
          // If no matching country was found, just use the raw values
          setPhoneValue(nationalNumber);
        }
      } else {
        // If regex doesn't match, just use as is
        setPhoneValue(defaultPhoneNumber);
      }
    }
    
    initializedRef.current = true;
  }, [defaultPhoneNumber]);

  useClickOutside(countryListRef as React.RefObject<HTMLElement>, () => {
    setShowCountryList(false)
    setSearchQuery('')
  })

  // Filter countries based on search
  const filteredCountries = searchQuery
    ? formattedCountries.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery)
    )
    : formattedCountries;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits, spaces, dashes, and parentheses
    const value = e.target.value.replace(/[^\d\s\-()]/g, '')
    setPhoneValue(value)

    // Clear error when user starts typing
    if (validationError) setValidationError(null)
  }

  const handleCountrySelect = (dialCode: string, iso2: CountryIso2) => {
    setSelectedCountry(iso2)
    setSelectedCountryDialCode(dialCode)
    setShowCountryList(false)
    setSearchQuery('')
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // Validate the phone number when error is set from outside
  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: t('errors.PHONE_INVALID'),
        description: error
      })
    }
  }, [error, t])

  // Function to validate phone number format
  const validatePhone = (): boolean => {
    // Strip all non-digit characters for validation
    const digitsOnly = phoneValue.replace(/\D/g, '')

    if (digitsOnly.length === 0) {
      setValidationError(t('uiErrors.phoneRequired'))
      toast({
        variant: "destructive",
        title: t('errors.PHONE_REQUIRED'),
        description: t('uiErrors.phoneRequired')
      })
      return false
    }

    if (digitsOnly.length < 7) {
      setValidationError(t('uiErrors.phoneInvalid'))
      toast({
        variant: "destructive",
        title: t('errors.PHONE_INVALID'),
        description: t('uiErrors.phoneInvalid')
      })
      return false
    }

    if (digitsOnly.length > 15) {
      setValidationError(t('uiErrors.phoneTooLong'))
      toast({
        variant: "destructive",
        title: t('errors.PHONE_INVALID'),
        description: t('uiErrors.phoneTooLong')
      })
      return false
    }

    return true
  }

  // Submit handler - now just validates the phone without submitting
  const handleValidatePhone = (e: React.FormEvent) => {
    e.preventDefault()
    return validatePhone()
  }

  // Updated submit handler that includes channel information
  const handleChannelSubmit = (selectedChannel: OtpChannel) => {
    if (!validatePhone()) {
      return
    }

    // Format phone with country code for submission
    const fullPhone = `${selectedCountryDialCode}${phoneValue.replace(/\D/g, '')}`
    onSubmit(fullPhone, selectedChannel)
  }

  // Get the dynamic message based on channel selection
  const getChannelMessage = () => {
    if (!channel) {
      return t('auth.selectChannel')
    }

    return channel === OtpChannel.WHATSAPP
      ? t('auth.weWillSendWhatsApp')
      : t('auth.weWillSendTelegram')
  }

  // Check if the submit button should be disabled
  const isSubmitDisabled = phoneValue.replace(/\D/g, '').length < 7 || isLoading

  return (
    <form onSubmit={handleValidatePhone} className="space-y-4 w-full">
      <div className="space-y-2">
        {/* Group for country code dropdown and phone input, respecting RTL/LTR */}
        <div className={`flex gap-2 w-full`} dir="ltr">
          {/* Country code selector */}
          <div className="relative" ref={countryListRef}>
            <Button
              type="button"
              variant="outline"
              size="default"
              className="border-none rounded-2xl h-12 bg-gray-100"
              onClick={() => setShowCountryList(!showCountryList)}
              withoutShadow
            >
              <div className="flex flex-row items-center justify-between min-w-[80px]">
                {getCountryFlag(selectedCountry)}
                <span className="text-sm font-medium">{selectedCountryDialCode}</span>
                <ChevronDownIcon className="h-4 w-4" />
              </div>
            </Button>

            {/* Country selection dropdown */}
            {showCountryList && (
              <Card className="absolute z-10 top-14 w-60 max-h-80 overflow-hidden">
                <CardContent className="p-0">
                  <div className="sticky top-0 bg-card p-2 border-b">
                    <div className="relative">
                      <Input
                        ref={searchInputRef}
                        icon={<SearchIcon />}
                        placeholder={t('common.countryCodeSearch')}
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {filteredCountries.length > 0 ? (
                      filteredCountries
                        .map((countryItem) => (
                          <button
                            key={`${countryItem.dialCode}-${countryItem.name}`}
                            type="button"
                            className="flex items-center w-full px-3 py-2 gap-1 hover:bg-accent text-left"
                            onClick={() => handleCountrySelect(countryItem.dialCode, countryItem.iso2)}
                          >
                            {getCountryFlag(countryItem.iso2)}
                            <span className="font-medium">+{countryItem.dialCode}</span>
                            <span className="ml-2 text-sm text-muted-foreground truncate">
                              {countryItem.name}
                            </span>
                            {countryItem.iso2 === selectedCountry && (
                              <CheckIcon className="h-4 w-4 ml-auto text-primary" />
                            )}
                          </button>
                        ))
                    ) : (
                      <div className="px-2 py-4 text-center text-muted-foreground">
                        {t('common.noResults')}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Phone number input */}
          <Input
            type="tel"
            placeholder={t('auth.enterPhonePlaceholder')}
            className="flex-1 h-12"
            value={phoneValue}
            onChange={handlePhoneChange}
            autoComplete="tel"
            aria-invalid={!!validationError || !!error}
            onClear={() => setPhoneValue('')}
          />
        </div>

        {/* Error message - visible in-line */}
        {(validationError || error) && (
          <div className="text-red-500 text-sm mt-2">
            {validationError || error}
          </div>
        )}
      </div>

      {/* Channel selector - WhatsApp and Telegram buttons */}
      <div className="space-y-12 mt-6">
        <div className="space-y-3">
          <p className="text-sm font-medium text-center mb-2">
            {t('auth.selectChannel')}
          </p>

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant={channel === OtpChannel.WHATSAPP ? "white" : "outline"}
              className={channel === OtpChannel.WHATSAPP ? "bg-[#25D366] text-white hover:bg-[#128C7E]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}
              onClick={() => setChannel(OtpChannel.WHATSAPP)}
              fullWidth
              size="default"
              withoutShadow={channel !== OtpChannel.WHATSAPP}
              icon={<WhatsAppIcon size={18} />}
            >
              {t('auth.whatsapp')}
            </Button>

            <Button
              type="button"
              variant={channel === OtpChannel.TELEGRAM ? "white" : "outline"}
              className={channel === OtpChannel.TELEGRAM ? "bg-[#0088cc] text-white hover:bg-[#0077b5]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}
              onClick={() => setChannel(OtpChannel.TELEGRAM)}
              fullWidth
              size="default"
              withoutShadow={channel !== OtpChannel.TELEGRAM}
              icon={<TelegramIcon size={18} />}
            >
              {t('auth.telegram')}
            </Button>
          </div>
        </div>

        {/* Confirmation button */}
        <div className="flex flex-col items-center justify-center">
          <Button
            type="submit"
            variant="gradient"
            disabled={isSubmitDisabled || !channel}
            isLoading={isLoading}
            size="lg"
            fullWidth
            onClick={(e) => {
              e.preventDefault();
              if (validatePhone() && channel) {
                handleChannelSubmit(channel);
              }
            }}
          >
            {t('common.continue')}
          </Button>
          {/* Dynamic message based on channel selection */}
          <p className="text-sm text-muted-foreground text-center mt-2">
            {channel ? getChannelMessage() : t('auth.pleaseSelectChannel')}
          </p>
        </div>
      </div>
    </form>
  )
}
