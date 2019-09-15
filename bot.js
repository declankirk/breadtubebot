/**
 * VIDEO ESSAY BOT
 * 
 * Author: Declan Kirk
 * Created: 08/09/2019
 * 
 * Posts hypothetical YouTube video essays to https://www.facebook.com/videoessaybot every hour.
 */

const config = require('../config/breadtubebot.json');
const PAGE_ID = config.page_id;
const TOKEN = config.token;
const FB = require('fb');
FB.setAccessToken(TOKEN);
const cron = require("node-cron");

/**
 * Image upload, scheduled for each hour
 */
const task = cron.schedule("0 * * * *", () => {
    genImg();
    var FormData = require('form-data');
    var fs = require('fs');
    var form = new FormData();
    form.append('access_token', TOKEN);
    form.append('source', fs.createReadStream("./out.png"));
    const fetch = require("node-fetch");
    fetch(`https://graph.facebook.com/${PAGE_ID}/photos`, {
        body: form,
        method: 'post'
    });
});

/**
 * Generates title, length and views as string
 */
function genTitle() {
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
    out += " | (" + mins + ":" + secs + ")";
    out = wordWrap(out, 25);
    var views = Math.floor(Math.random()*1000000);
    views = views.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    out += "\n\n" + views + " views";

    return out;
}

/**
 * Generates basic image
 */
function genImg() {
    var text2png = require('text2png');
    var fs = require('fs');
    fs.writeFileSync('out.png', text2png(genTitle(), {
        color: 'black',
        backgroundColor: '#f1f1f1',
        font: '80px Sans',
        padding: 75
    }));
}

/**
 * Wraps text string
 * Stolen from https://stackoverflow.com/questions/14484787/wrap-text-in-javascript
 */
function wordWrap(str, maxWidth) {
    var newLineStr = "\n"; done = false; res = '';
    while (str.length > maxWidth) {                 
        found = false;
        // Inserts new line at first whitespace of the line
        for (i = maxWidth - 1; i >= 0; i--) {
            if (testWhite(str.charAt(i))) {
                res = res + [str.slice(0, i), newLineStr].join('');
                str = str.slice(i + 1);
                found = true;
                break;
            }
        }
        // Inserts new line at maxWidth position, the word is too long to wrap
        if (!found) {
            res += [str.slice(0, maxWidth), newLineStr].join('');
            str = str.slice(maxWidth);
        }

    }
    return res + str;
}
function testWhite(x) {
    var white = new RegExp(/^\s$/);
    return white.test(x.charAt(0));
};


task.start();