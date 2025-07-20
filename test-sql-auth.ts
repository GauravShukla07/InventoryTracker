#!/usr/bin/env tsx
/**
 * Test SQL Server Authentication vs Windows Authentication
 * This script demonstrates both authentication methods
 */

import dotenv from 'dotenv';
dotenv.config();

import sql from 'mssql';

// Test SQL Server Authentication (like Python ODBC connection string)
async function testSqlAuthentication() {
  console.log('🔐 Testing SQL Server Authentication');
  console.log('===================================');
  
  const username = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;
  
  if (!username || !password) {
    console.log('❌ SQL_USER and SQL_PASSWORD not configured');
    console.log('💡 To test SQL Authentication, add to .env file:');
    console.log('   SQL_USER=your_sql_username');
    console.log('   SQL_PASSWORD=your_sql_password');
    return false;
  }
  
  const config: sql.config = {
    server: process.env.SQL_SERVER_HOST || 'WSERVER718623-I\\SQLEXPRESS',
    database: process.env.SQL_DATABASE || 'InventoryDB',
    user: username,
    password: password,
    options: {
      encrypt: process.env.SQL_ENCRYPT === 'true' || false,
      trustServerCertificate: process.env.SQL_TRUST_CERT !== 'false',
      enableArithAbort: true,
      instanceName: process.env.SQL_INSTANCE || 'SQLEXPRESS',
      connectTimeout: 10000,
      requestTimeout: 5000,
    }
  };
  
  console.log(`📍 Server: ${config.server}`);
  console.log(`🗄️  Database: ${config.database}`);
  console.log(`👤 User: ${username}`);
  console.log(`🔒 Encrypt: ${config.options?.encrypt}`);
  console.log(`🔑 Trust Cert: ${config.options?.trustServerCertificate}`);
  
  try {
    console.log('⏳ Connecting with SQL Authentication...');
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log('✅ SQL Authentication successful!');
    
    // Test query
    const result = await pool.request().query('SELECT @@VERSION as version, SYSTEM_USER as current_user');
    console.log(`📊 SQL Server Version: ${result.recordset[0].version.split('\n')[0]}`);
    console.log(`👤 Current User: ${result.recordset[0].current_user}`);
    
    await pool.close();
    return true;
    
  } catch (error: any) {
    console.log('❌ SQL Authentication failed');
    console.log(`Error: ${error.message}`);
    console.log(`Code: ${error.code || 'Unknown'}`);
    
    if (error.code === 'ELOGIN') {
      console.log('💡 Authentication failed - check username and password');
    } else if (error.code === 'EINSTLOOKUP') {
      console.log('💡 Server not found - check server name and network connectivity');
    }
    
    return false;
  }
}

// Test Windows Authentication (current method)
async function testWindowsAuthentication() {
  console.log('\n🪟 Testing Windows Authentication');
  console.log('=================================');
  
  const config: sql.config = {
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
      instanceName: process.env.SQL_INSTANCE || 'SQLEXPRESS',
      connectTimeout: 10000,
      requestTimeout: 5000,
    }
  };
  
  console.log(`📍 Server: ${config.server}`);
  console.log(`🗄️  Database: ${config.database}`);
  console.log(`🔐 Auth Type: Windows/NTLM`);
  
  try {
    console.log('⏳ Connecting with Windows Authentication...');
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log('✅ Windows Authentication successful!');
    
    // Test query
    const result = await pool.request().query('SELECT @@VERSION as version, SYSTEM_USER as current_user');
    console.log(`📊 SQL Server Version: ${result.recordset[0].version.split('\n')[0]}`);
    console.log(`👤 Current User: ${result.recordset[0].current_user}`);
    
    await pool.close();
    return true;
    
  } catch (error: any) {
    console.log('❌ Windows Authentication failed');
    console.log(`Error: ${error.message}`);
    console.log(`Code: ${error.code || 'Unknown'}`);
    
    return false;
  }
}

// Generate equivalent Python ODBC connection string
function generatePythonConnectionString() {
  console.log('\n🐍 Equivalent Python ODBC Connection String');
  console.log('==========================================');
  
  const server = process.env.SQL_SERVER_HOST || 'WSERVER718623-I\\SQLEXPRESS';
  const database = process.env.SQL_DATABASE || 'InventoryDB';
  const username = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;
  const encrypt = process.env.SQL_ENCRYPT === 'true' ? 'yes' : 'no';
  const trustCert = process.env.SQL_TRUST_CERT !== 'false' ? 'yes' : 'no';
  
  if (username && password) {
    // SQL Server Authentication
    console.log('conn_str = (');
    console.log('    r"DRIVER={ODBC Driver 17 for SQL Server};"');
    console.log(`    r"SERVER=${server};"`);
    console.log(`    r"DATABASE=${database};"`);
    console.log(`    r"UID=${username};"`);
    console.log(`    r"PWD=${password};"`);
    console.log(`    r"Encrypt=${encrypt};"`);
    console.log(`    r"TrustServerCertificate=${trustCert};"`);
    console.log(')');
  } else {
    // Windows Authentication
    console.log('conn_str = (');
    console.log('    r"DRIVER={ODBC Driver 17 for SQL Server};"');
    console.log(`    r"SERVER=${server};"`);
    console.log(`    r"DATABASE=${database};"`);
    console.log('    r"Trusted_Connection=yes;"');
    console.log(`    r"Encrypt=${encrypt};"`);
    console.log(`    r"TrustServerCertificate=${trustCert};"`);
    console.log(')');
  }
}

async function main() {
  console.log('🧪 SQL Server Authentication Test Suite');
  console.log('=======================================\n');
  
  // Test both authentication methods
  const sqlAuthSuccess = await testSqlAuthentication();
  const winAuthSuccess = await testWindowsAuthentication();
  
  generatePythonConnectionString();
  
  console.log('\n📋 Test Results Summary');
  console.log('======================');
  console.log(`SQL Server Authentication: ${sqlAuthSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Windows Authentication: ${winAuthSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (!sqlAuthSuccess && !winAuthSuccess) {
    console.log('\n💡 Neither authentication method worked. This indicates:');
    console.log('   - Server is not accessible from this environment');
    console.log('   - Network connectivity issue');
    console.log('   - Server name or credentials are incorrect');
  } else if (sqlAuthSuccess) {
    console.log('\n🎯 Recommendation: Use SQL Server Authentication for production');
  } else if (winAuthSuccess) {
    console.log('\n🎯 Recommendation: Windows Authentication works for domain environments');
  }
  
  process.exit(sqlAuthSuccess || winAuthSuccess ? 0 : 1);
}

main().catch(console.error);