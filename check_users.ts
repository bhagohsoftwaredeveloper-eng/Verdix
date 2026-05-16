
import { query } from './lib/mysql';

async function main() {
  try {
    const users = await query('SELECT uid, username, user_type, display_name FROM users');
    console.log('Users:', users);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
