// scripts/validate-config.ts
// Quick validation script to test APP_CONFIG setup

import { APP_CONFIG, validateConfig } from '../constants/app-config';

function logSection(title: string, config: any) {
  console.log(`\n📋 ${title}:`);
  Object.entries(config).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      console.log(`  ${key}:`);
      Object.entries(value).forEach(([subKey, subValue]) => {
        console.log(`    ${subKey}: ${subValue}`);
      });
    } else {
      console.log(`  ${key}: ${value}`);
    }
  });
}

function main() {
  console.log('🔧 APP_CONFIG Validation Test\n');
  
  try {
    // Test configuration validation
    validateConfig();
    console.log('✅ Configuration validation passed');
  } catch (error) {
    console.log('❌ Configuration validation failed:', error);
    return;
  }

  // Display all configuration sections
  logSection('API Configuration', APP_CONFIG.API);
  logSection('Security Configuration', APP_CONFIG.SECURITY);
  logSection('Storage Configuration', APP_CONFIG.STORAGE);
  logSection('Platform Configuration', APP_CONFIG.PLATFORM);
  logSection('Features Configuration', APP_CONFIG.FEATURES);
  logSection('Transaction Configuration', APP_CONFIG.TRANSACTION);
  // logSection('Blockchain Configuration', APP_CONFIG.BLOCKCHAIN);
  // logSection('Validation Configuration', APP_CONFIG.VALIDATION);
  // logSection('Branding Configuration', APP_CONFIG.BRANDING);
  logSection('Logging Configuration', APP_CONFIG.LOGGING);
  logSection('UI Configuration', APP_CONFIG.UI);

  console.log('\n✅ All configurations loaded successfully!');
  console.log('\n🚀 Ready for Web3 integration when packages are installed!');
}

if (require.main === module) {
  main();
} 