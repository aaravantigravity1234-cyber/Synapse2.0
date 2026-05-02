const { JSDOM } = require("jsdom");
const dom = new JSDOM("");
const div = dom.window.document.createElement("div");
div.textContent = "\" '";
console.log(div.innerHTML);
