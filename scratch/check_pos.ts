import { query } from '../lib/mysql';

async function main() {
  try {
    const settings: any = await query('SELECT * FROM pos_settings');
    console.log("POS Settings:", JSON.stringify(settings, null, 2));
    
    const terminals: any = await query('SELECT * FROM pos_terminals');
    console.log("POS Terminals:", JSON.stringify(terminals, null, 2));
  } catch (error) {
    console.error(error);
  }
}

main();
