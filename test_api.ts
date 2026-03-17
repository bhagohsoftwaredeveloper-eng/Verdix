async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/inventory/stock-counts/undefined');
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text);
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    process.exit(0);
  }
}

test();
