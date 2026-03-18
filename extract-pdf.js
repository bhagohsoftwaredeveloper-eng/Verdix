const fs = require('fs');

async function extract() {
  const { PDFParse } = await import('pdf-parse');
  
  let dataBuffer = fs.readFileSync('RMO No. 24-2023.pdf');
  
  try {
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();
    fs.writeFileSync('rmo_content.txt', data.text);
    console.log('PDF extracted to rmo_content.txt');
  } catch (err) {
    console.error("Extraction failed:", err);
  }
}

extract();
