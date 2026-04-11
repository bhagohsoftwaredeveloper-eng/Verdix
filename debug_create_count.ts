import { MySqlStockCountRepository } from './src/infrastructure/repositories/MySqlStockCountRepository';

async function test() {
  const repo = new MySqlStockCountRepository();
  const id = `sc_test_${Date.now()}`;
  try {
    const createdId = await repo.create({
      id,
      name: 'Test Count',
      status: 'in_progress',
      items: [],
      createdBy: 'Tester'
    });
    console.log('Created ID:', createdId);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

test();
