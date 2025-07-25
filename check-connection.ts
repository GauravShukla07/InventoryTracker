#!/usr/bin/env tsx
/**
 * Command-line utility to check SQL Server connection status
 * Usage: npm run check-connection or tsx check-connection.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { checkSqlServerConnection, getConnectionStatus } from './server/connection-test';

async function main() {
  console.log('🔍 SQL Server Connection Checker');
  console.log('================================\n');
  
  console.log('Configuration:');
  console.log(`📍 Server: ${process.env.SQL_SERVER_HOST || 'WSERVER718623-I\\SQLEXPRESS'}`);
  console.log(`🗄️  Database: ${process.env.SQL_DATABASE || 'InventoryDB'}`);
  console.log(`⚙️  SQL_SERVER Mode: ${process.env.SQL_SERVER || 'false'}\n`);
  
  // Quick status check
  const statusMessage = await getConnectionStatus();
  console.log(statusMessage);
  console.log('');
  
  // Detailed connection test
  const result = await checkSqlServerConnection();
  
  console.log('📋 Detailed Connection Report:');
  console.log('------------------------------');
  console.log(`Status: ${result.status}`);
  console.log(`Connected: ${result.isConnected ? '✅ Yes' : '❌ No'}`);
  
  if (result.error) {
    console.log(`❌ Error: ${result.error}`);
  }
  
  console.log('\n📊 Details:');
  Object.entries(result.details).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      console.log(`  ${key}: [${value.join(', ')}]`);
    } else if (typeof value === 'object' && value !== null) {
      console.log(`  ${key}:`);
      Object.entries(value).forEach(([subKey, subValue]) => {
        console.log(`    ${subKey}: ${subValue}`);
      });
    } else {
      console.log(`  ${key}: ${value}`);
    }
  });
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (result.isConnected) {
    if (result.status === 'FULLY_CONNECTED') {
      console.log('✅ Everything looks good! Your SQL Server is ready for use.');
    } else if (result.status === 'CONNECTED_MISSING_TABLES') {
      console.log('⚠️  Connected but missing tables. Run: npm run setup-sqlserver');
    }
  } else {
    console.log('❌ Connection failed. Check:');
    console.log('   - SQL Server is running and accessible');
    console.log('   - Server name is correct: WSERVER718623-I\\SQLEXPRESS');
    console.log('   - Database "InventoryDB" exists');
    console.log('   - Windows Authentication is enabled');
    console.log('   - Firewall allows connections');
  }
  
  process.exit(result.isConnected ? 0 : 1);
}

// Handle errors gracefully
main().catch(error => {
  console.error('❌ Connection checker failed:', error.message);
  process.exit(1);
});