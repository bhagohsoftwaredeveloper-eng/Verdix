import { query } from '../lib/mysql';

async function setup() {
  try {
    console.log('--- Setting up Meal Ticket Database Schema ---');

    // 1. Update customers table
    console.log('Updating customers table...');
    const customerColumns = await query(`DESCRIBE customers`);
    const columnNames = (customerColumns as any[]).map(c => c.Field);

    if (!columnNames.includes('is_student')) {
      await query(`ALTER TABLE customers ADD COLUMN is_student BOOLEAN DEFAULT FALSE`);
      console.log('✅ Added is_student to customers');
    }

    if (!columnNames.includes('fingerprint_data')) {
      await query(`ALTER TABLE customers ADD COLUMN fingerprint_data TEXT NULL`);
      console.log('✅ Added fingerprint_data to customers');
    }

    // 2. Create meal_tickets table
    console.log('Creating meal_tickets table...');
    await query(`
      CREATE TABLE IF NOT EXISTS meal_tickets (
        id VARCHAR(50) PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL,
        status ENUM('Pending', 'Released') DEFAULT 'Pending',
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        released_at TIMESTAMP NULL,
        authorized_by VARCHAR(255),
        FOREIGN KEY (student_id) REFERENCES customers(id) ON DELETE CASCADE,
        INDEX idx_student_id (student_id),
        INDEX idx_status (status)
      )
    `);
    console.log('✅ meal_tickets table created');

    console.log('--- Database Setup Complete ---');
  } catch (error) {
    console.error('Error during database setup:', error);
  } finally {
    process.exit();
  }
}

setup();
