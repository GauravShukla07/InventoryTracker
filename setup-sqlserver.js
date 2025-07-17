// Setup script for SQL Server database
// Run with: node setup-sqlserver.js

const fs = require('fs');
const { getSqlServerConnection } = require('./server/sqlserver-db.ts');
const sql = require('mssql');

async function setupDatabase() {
  console.log('Setting up SQL Server database...');
  
  try {
    const connection = await getSqlServerConnection();
    
    if (!connection) {
      throw new Error('Could not connect to SQL Server');
    }
    
    // Read and execute the schema SQL file
    const schemaSQL = fs.readFileSync('./server/sqlserver-schema.sql', 'utf-8');
    
    // Split by GO statements and execute each batch
    const batches = schemaSQL.split(/\s*GO\s*/gi).filter(batch => batch.trim());
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        try {
          await connection.request().query(batch);
          console.log(`✅ Executed batch ${i + 1}/${batches.length}`);
        } catch (error) {
          console.log(`⚠️ Warning in batch ${i + 1}:`, error.message);
        }
      }
    }
    
    console.log('🎉 SQL Server database setup completed!');
    console.log('📝 To use SQL Server instead of PostgreSQL, set environment variable:');
    console.log('   SQL_SERVER=true');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('💡 Make sure:');
    console.log('  - SQL Server is running');
    console.log('  - InventoryDB database exists');
    console.log('  - You have sufficient permissions');
  }
  
  process.exit(0);
}

setupDatabase();