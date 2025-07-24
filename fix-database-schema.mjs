// Fix Database Schema and Create Users Table
// This script connects to SQL Server and ensures proper table structure

import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

async function fixDatabaseSchema() {
  const config = {
    server: '163.227.186.23',
    database: 'USE InventoryDB',
    port: 2499,
    user: 'john_login_user',
    password: process.env.SQL_AUTH_PASSWORD || 'StrongPassword1!',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectTimeout: 30000,
      requestTimeout: 30000
    }
  };

  try {
    console.log('🔧 Connecting to SQL Server...');
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected successfully');

    // Check if users table exists
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = 'users'
    `);
    
    if (tablesResult.recordset.length === 0) {
      console.log('🆕 Creating users table...');
      
      await pool.request().query(`
        CREATE TABLE users (
          id INT IDENTITY(1,1) PRIMARY KEY,
          username NVARCHAR(255) NOT NULL UNIQUE,
          email NVARCHAR(255) NOT NULL UNIQUE,
          password NVARCHAR(255) NOT NULL,
          role NVARCHAR(50) NOT NULL DEFAULT 'viewer',
          role_password NVARCHAR(255),
          department NVARCHAR(255),
          is_active BIT NOT NULL DEFAULT 1
        )
      `);
      
      console.log('✅ Users table created');
      
      // Insert sample users
      const sampleUsers = [
        { username: 'admin', email: 'admin@inventory.com', password: 'password123', role: 'admin_user', role_password: 'AdminPass123!' },
        { username: 'manager', email: 'manager@inventory.com', password: 'manager123', role: 'manager_user', role_password: 'ManagerPass123!' },
        { username: 'operator', email: 'operator@inventory.com', password: 'operator123', role: 'inventory_operator', role_password: 'InventoryOp123!' },
        { username: 'viewer', email: 'viewer@inventory.com', password: 'viewer123', role: 'viewer_user', role_password: 'ViewerPass123!' }
      ];
      
      console.log('👤 Creating sample users...');
      for (const user of sampleUsers) {
        await pool.request()
          .input('username', sql.NVarChar, user.username)
          .input('email', sql.NVarChar, user.email)
          .input('password', sql.NVarChar, user.password)
          .input('role', sql.NVarChar, user.role)
          .input('role_password', sql.NVarChar, user.role_password)
          .query(`
            INSERT INTO users (username, email, password, role, role_password, is_active)
            VALUES (@username, @email, @password, @role, @role_password, 1)
          `);
        console.log(`✅ Created user: ${user.username}`);
      }
      
      console.log('\n🎉 Database setup completed! You can now login with:');
      sampleUsers.forEach(user => {
        console.log(`  - Username: "${user.username}" / Password: "${user.password}"`);
      });
      
    } else {
      console.log('✅ Users table already exists');
      
      // Check existing users
      const usersResult = await pool.request().query('SELECT username, email, role FROM users');
      console.log(`Found ${usersResult.recordset.length} existing users:`);
      usersResult.recordset.forEach(user => {
        console.log(`  - ${user.username} (${user.email}) - Role: ${user.role}`);
      });
    }

    await pool.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixDatabaseSchema();