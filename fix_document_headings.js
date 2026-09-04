const fs = require('fs');
let content = fs.readFileSync('src/docx/document.ts', 'utf-8');

// Replace the condition `else if (type === 'h' && plainText.length > 150) {`
// With a better heuristic

content = content.replace(
  /\} else if \(type === 'h' && plainText\.length > 150\) \{/,
  `} else if (type === 'h' && (plainText.length > 100 || /[;:]\\s*(e\\s*)?$/.test(plainText.trim()) || /^[a-z]/.test(plainText.trim()))) {`
);

fs.writeFileSync('src/docx/document.ts', content);
