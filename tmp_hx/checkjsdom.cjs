const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html>');
console.log('jsdom ok:', typeof JSDOM, 'DOMParser:', typeof dom.window.DOMParser);
