#!/usr/bin/env tsx

/**
 * Setup Test Data Script
 * 
 * This script inserts dummy contacts and other test data into the local database
 * for development and testing purposes.
 * 
 * Usage:
 *   npm run setup-test-data
 *   or
 *   npx tsx scripts/setup-test-data.ts
 */

import { loadPlatform } from '@/platform'
import { ContactRepository } from '@/platform/data-layer/repositories/contact-repository'
import { StorageManagerV2 } from '@/platform/storage/storage-manager-v2'
import type { Contact } from '@/types'

const DUMMY_CONTACTS: Omit<Contact, 'id' | 'initial' | 'syncedAt'>[] = [
  {
    name: 'Ahmed Hassan',
    phone: '+963912345678',
    phoneHash: 'hash_963912345678',
    email: 'ahmed.hassan@example.com',
    isFavorite: true,
    hasAccount: true,
    walletAddress: 'AhmedWallet123456789ABCDEFGHIJKLMNOPQR'
  },
  {
    name: 'Fatima Al-Zahra',
    phone: '+963987654321',
    phoneHash: 'hash_963987654321',
    email: 'fatima.alzahra@example.com',
    isFavorite: false,
    hasAccount: true,
    walletAddress: 'FatimaWallet123456789ABCDEFGHIJKLMNOP'
  },
  {
    name: 'Omar Khayyam',
    phone: '+963955123456',
    phoneHash: 'hash_963955123456',
    email: 'omar.khayyam@example.com',
    isFavorite: false,
    hasAccount: true,
    walletAddress: 'OmarWallet123456789ABCDEFGHIJKLMNOPQ'
  },
  {
    name: 'Layla Majnun',
    phone: '+963944987654',
    phoneHash: 'hash_963944987654',
    email: 'layla.majnun@example.com',
    isFavorite: true,
    hasAccount: false, // Non-user contact
  },
  {
    name: 'Khalid Ibn Walid',
    phone: '+963933456789',
    phoneHash: 'hash_963933456789',
    isFavorite: false,
    hasAccount: true,
    walletAddress: 'KhalidWallet123456789ABCDEFGHIJKLMNO'
  },
  {
    name: 'Nour Al-Din',
    phone: '+963922111222',
    phoneHash: 'hash_963922111222',
    email: 'nour.aldin@example.com',
    isFavorite: false,
    hasAccount: true,
    walletAddress: 'NourWallet123456789ABCDEFGHIJKLMNOP'
  },
  {
    name: 'Yasmin Al-Sham',
    phone: '+963933222333',
    phoneHash: 'hash_963933222333',
    email: 'yasmin.alsham@example.com',
    isFavorite: true,
    hasAccount: false,
  },
  {
    name: 'Salim Al-Dimashqi',
    phone: '+963944333444',
    phoneHash: 'hash_963944333444',
    isFavorite: false,
    hasAccount: true,
    walletAddress: 'SalimWallet123456789ABCDEFGHIJKLMNO'
  }
]

async function setupTestData() {
  try {
    console.log('🚀 Setting up test data...')
    
    // Initialize platform
    const platform = await loadPlatform()
    const db = await platform.getLocalDB()
    
    // Create storage manager
    const storageManager = new StorageManagerV2(db, {
      user: {} as any,
      transaction: {} as any,
      wallet: {} as any,
      contact: {} as any,
    })
    
    // Create contact repository
    const contactRepo = new ContactRepository(storageManager)
    
    // Clear existing contacts first
    console.log('🧹 Clearing existing contacts...')
    await db.clear('contacts')
    
    // Insert dummy contacts
    console.log('📋 Inserting dummy contacts...')
    const insertedContacts = await contactRepo.addMany(DUMMY_CONTACTS)
    
    console.log(`✅ Successfully inserted ${insertedContacts.length} contacts:`)
    insertedContacts.forEach(contact => {
      console.log(`   - ${contact.name} (${contact.phone})`)
    })
    
    console.log('\n🎉 Test data setup complete!')
    console.log('\nTo remove test data, run: npm run clear-test-data')
    
  } catch (error) {
    console.error('❌ Failed to setup test data:', error)
    process.exit(1)
  }
}

async function clearTestData() {
  try {
    console.log('🧹 Clearing test data...')
    
    const platform = await loadPlatform()
    const db = await platform.getLocalDB()
    
    // Clear contacts
    await db.clear('contacts')
    
    console.log('✅ Test data cleared successfully!')
    
  } catch (error) {
    console.error('❌ Failed to clear test data:', error)
    process.exit(1)
  }
}

// Parse command line arguments
const command = process.argv[2]

async function main() {
  switch (command) {
    case 'clear':
      await clearTestData()
      break
    case 'setup':
    default:
      await setupTestData()
      break
  }
}

// Run the script
main().catch(console.error) 