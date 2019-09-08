var fs = require("fs");
var text = fs.readFileSync("./templates.txt");
var templates = text.toString().split("\r\n");
text = fs.readFileSync("./nouns.txt");
var nouns = text.toString().split("\r\n");
text = fs.readFileSync("./adjectives.txt");
var adjectives = text.toString().split("\r\n");

var template = templates[Math.floor(Math.random()*templates.length)];
var out = "";

for (var i = 0; i < template.length; i++) {
    if (template.charAt(i) == '#') {
        var noun = nouns[Math.floor(Math.random()*nouns.length)];
        out += noun;
    }
    else if (template.charAt(i) == '%') {
        var adj = adjectives[Math.floor(Math.random()*adjectives.length)];
        out += adj;
    } else {
        out += template.charAt(i);
    }
}

var mins = Math.floor(Math.random()*59);
var secs = ("0" + Math.floor(Math.random()*59)).slice(-2);
var views = Math.floor(Math.random()*1000000);
views = views.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
out += " | (" + mins + ":" + secs + ")\n" + views + " views";


console.log(out);
