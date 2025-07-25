#!/usr/bin/env tsx
/**
 * Advanced SQL Server connection debugging utility
 * Tests various connection scenarios and provides detailed diagnostics
 */

import dotenv from 'dotenv';
dotenv.config();

import sql from 'mssql';

// Test different connection configurations
const connectionConfigs = [
  {
    name: "Current Configuration (Windows Auth)",
    config: {
      server: process.env.SQL_SERVER_HOST || 'WSERVER718623-I\\SQLEXPRESS',
      database: process.env.SQL_DATABASE || 'InventoryDB',
      authentication: {
        type: 'ntlm',
        options: {
          domain: process.env.SQL_DOMAIN || '',
          userName: process.env.SQL_USER || '',
          password: process.env.SQL_PASSWORD || '',
        }
      },
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: 'SQLEXPRESS',
        connectTimeout: 10000,
        requestTimeout: 5000,
      }
    }
  },
  {
    name: "IP Address Test (if available)",
    config: {
      server: process.env.SQL_SERVER_IP || '192.168.1.100', // placeholder IP
      port: 1433,
      database: process.env.SQL_DATABASE || 'InventoryDB',
      authentication: {
        type: 'ntlm',
        options: {
          domain: process.env.SQL_DOMAIN || '',
          userName: process.env.SQL_USER || '',
          password: process.env.SQL_PASSWORD || '',
        }
      },
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectTimeout: 5000,
        requestTimeout: 3000,
      }
    }
  },
  {
    name: "SQL Server Authentication (if enabled)",
    config: {
      server: process.env.SQL_SERVER_HOST || 'WSERVER718623-I\\SQLEXPRESS',
      database: process.env.SQL_DATABASE || 'InventoryDB',
      user: process.env.SQL_USER || 'sa',
      password: process.env.SQL_PASSWORD || '',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: 'SQLEXPRESS',
        connectTimeout: 5000,
        requestTimeout: 3000,
      }
    }
  }
];

async function testConnection(name: string, config: any): Promise<void> {
  console.log(`\n🔍 Testing: ${name}`);
  console.log('─'.repeat(50));
  
  try {
    console.log(`Server: ${config.server}${config.port ? ':' + config.port : ''}`);
    console.log(`Database: ${config.database}`);
    console.log(`Auth Type: ${config.authentication?.type || 'SQL Server'}`);
    
    const pool = new sql.ConnectionPool(config);
    
    console.log('⏳ Attempting connection...');
    await pool.connect();
    
    console.log('✅ Connection successful!');
    
    // Test basic query
    const result = await pool.request().query('SELECT @@VERSION as version, DB_NAME() as current_db');
    console.log(`📊 SQL Server Version: ${result.recordset[0].version.split('\n')[0]}`);
    console.log(`📄 Current Database: ${result.recordset[0].current_db}`);
    
    // Test tables
    const tablesResult = await pool.request().query(`
      SELECT COUNT(*) as table_count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);
    console.log(`📋 Tables in database: ${tablesResult.recordset[0].table_count}`);
    
    await pool.close();
    console.log('✅ Connection test completed successfully');
    
  } catch (error: any) {
    console.log('❌ Connection failed');
    console.log(`Error Code: ${error.code || 'Unknown'}`);
    console.log(`Error Message: ${error.message}`);
    
    if (error.code === 'EINSTLOOKUP' || error.code === 'ENOTFOUND') {
      console.log('💡 This is a DNS resolution error - the server name cannot be found');
      console.log('   Possible causes:');
      console.log('   - Server is not accessible from this network');
      console.log('   - Server name is incorrect');
      console.log('   - DNS configuration issues');
    } else if (error.code === 'ETIMEOUT') {
      console.log('💡 Connection timeout - server may be unreachable or firewall blocking');
    } else if (error.code === 'ELOGIN') {
      console.log('💡 Authentication failed - check credentials');
    }
  }
}

async function main() {
  console.log('🔧 SQL Server Connection Diagnostics');
  console.log('=====================================');
  
  console.log('\n📋 Environment Configuration:');
  console.log(`SQL_SERVER: ${process.env.SQL_SERVER}`);
  console.log(`SQL_SERVER_HOST: ${process.env.SQL_SERVER_HOST || 'WSERVER718623-I\\SQLEXPRESS'}`);
  console.log(`SQL_DATABASE: ${process.env.SQL_DATABASE || 'InventoryDB'}`);
  console.log(`SQL_DOMAIN: ${process.env.SQL_DOMAIN || '(not set)'}`);
  console.log(`SQL_USER: ${process.env.SQL_USER || '(not set)'}`);
  console.log(`SQL_SERVER_IP: ${process.env.SQL_SERVER_IP || '(not set)'}`);
  
  // Test each configuration
  for (const testConfig of connectionConfigs) {
    await testConnection(testConfig.name, testConfig.config);
  }
  
  console.log('\n🎯 Recommendations:');
  console.log('===================');
  console.log('1. If all tests fail with DNS errors:');
  console.log('   - Verify server name: WSERVER718623-I\\SQLEXPRESS');
  console.log('   - Try using IP address instead of server name');
  console.log('   - Check if VPN connection is required');
  
  console.log('\n2. For production deployment:');
  console.log('   - Deploy on same network as SQL Server');
  console.log('   - Configure firewall to allow SQL Server connections');
  console.log('   - Use SQL Server authentication if Windows Auth not available');
  
  console.log('\n3. For testing from cloud environment:');
  console.log('   - Use Azure SQL Database or cloud-hosted SQL Server');
  console.log('   - Configure proper network connectivity');
  console.log('   - Set up VPN tunnel if using on-premises server');
}

main().catch(console.error);