const sql = require('mssql');

async function testDatabaseStructure() {
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
    console.log('\n📋 Checking table structure...');
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);
    
    console.log('📊 Available tables:');
    tablesResult.recordset.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}`);
    });

    // Check users table structure if it exists
    const usersTableExists = tablesResult.recordset.some(table => 
      table.TABLE_NAME.toLowerCase() === 'users'
    );

    if (usersTableExists) {
      console.log('\n🔍 Users table structure:');
      const columnsResult = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users'
        ORDER BY ORDINAL_POSITION
      `);
      
      columnsResult.recordset.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });

      // Check if there are any users
      console.log('\n👥 Checking existing users...');
      const usersResult = await pool.request().query('SELECT TOP 5 * FROM users');
      console.log(`Found ${usersResult.recordset.length} users`);
      
      if (usersResult.recordset.length > 0) {
        console.log('Sample user data:');
        usersResult.recordset.forEach(user => {
          console.log(`  - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
        });
      }
    } else {
      console.log('\n❌ Users table does not exist. Creating it...');
      
      // Create users table
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
      
      console.log('\n👤 Creating sample users...');
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
    }

    await pool.close();
    console.log('\n🎉 Database structure check completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDatabaseStructure();