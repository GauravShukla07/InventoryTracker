// Test script to validate SQL Server connection
// Run with: node test-sqlserver.js

import { testSqlServerConnection, getSqlServerConnection, executeSqlQuery } from './server/sqlserver-db.js';

async function testConnection() {
  console.log('Testing SQL Server connection...');
  
  try {
    const isConnected = await testSqlServerConnection();
    
    if (isConnected) {
      console.log('✅ SQL Server connection successful!');
      
      // Test querying existing tables
      try {
        const result = await executeSqlQuery('SELECT name FROM sys.tables ORDER BY name');
        console.log('📋 Available tables:', result.recordset.map(r => r.name));
      } catch (error) {
        console.log('📋 Could not list tables (database may be empty):', error.message);
      }
      
    } else {
      console.log('❌ SQL Server connection failed');
      console.log('🔍 Check these common issues:');
      console.log('  - Ensure SQL Server is running');
      console.log('  - Verify server name: WSERVER718623-I\\SQLEXPRESS');
      console.log('  - Check if InventoryDB database exists');
      console.log('  - Confirm Windows Authentication is enabled');
      console.log('  - Verify network connectivity to the server');
    }
    
  } catch (error) {
    console.error('❌ Connection test error:', error.message);
    console.log('💡 Common solutions:');
    console.log('  - Install SQL Server ODBC Driver 17');
    console.log('  - Run: npm install msnodesqlv8 (for Windows Auth)');
    console.log('  - Check firewall settings');
    console.log('  - Ensure SQL Server Browser service is running');
  }
  
  process.exit(0);
}

testConnection();