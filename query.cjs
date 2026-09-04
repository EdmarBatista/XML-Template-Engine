const fs = require('fs');
const xml = fs.readFileSync('tmp_hx/oszip/word/document.xml', 'utf8');
const match = xml.match(/<w:p [^>]*>.*?CONDIÇÕES GERAIS.*?<\/w:p>/);
console.log(match ? match[0] : "not found");
