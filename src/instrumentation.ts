
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only import and run scheduler on server side logic, 
    // though register runs in all envs, we want the node one.
    const { initScheduler } = await import('./lib/scheduler');
    console.log('Initializing backup scheduler...');
    initScheduler();
  }
}
