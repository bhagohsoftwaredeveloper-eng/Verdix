const fs = require('fs');
const pdfParse = require('pdf-parse');

let dataBuffer = fs.readFileSync('lib/sdk/ESC Windows SDK.pdf');

pdfParse(dataBuffer).then(function(data) {
  fs.writeFileSync('lib/sdk/manual.txt', data.text);
  console.log('PDF extracted to manual.txt');
}).catch(function(err) {
  console.error("PDF extraction failed", err);
});
