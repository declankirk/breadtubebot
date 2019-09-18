/**
 * VIDEO ESSAY BOT
 * 
 * Author: Declan Kirk
 * Created: 08/09/2019
 * 
 * Posts hypothetical YouTube video essays to https://www.facebook.com/videoessaybot every 3 hours.
 * 
 * Version 1.1.0
 */

const config = require('../config/breadtubebot.json');
const PAGE_ID = config.page_id;
const TOKEN = config.token;
const UNSPLASH_ACCESS = config.unsplash_access;
const UNSPLASH_SECRET = config.unsplash_secret;

const FB = require('fb');
FB.setAccessToken(TOKEN);

const Unsplash = require('unsplash-js').default;
const unsplash = new Unsplash({
  applicationId: UNSPLASH_ACCESS,
  secret: UNSPLASH_SECRET
});

const cron = require('node-cron');

global.fetch = require('node-fetch');

/**
 * Generates random title
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
    var keywords = [];

    for (var i = 0; i < template.length; i++) {
        if (template.charAt(i) == '#') {
            var noun = nouns[Math.floor(Math.random()*nouns.length)];
            out += noun;
            keywords.push(noun);
        }
        else if (template.charAt(i) == '%') {
            var adj = adjectives[Math.floor(Math.random()*adjectives.length)];
            out += adj;
            keywords.push(adj);
        } else {
            out += template.charAt(i);
        }
    }

    var ret = {
        "title": out,
        "keywords": keywords
    }

    return ret;
}

/**
 * Generates random video length
 */
function genTime() {
    var mins = ("0" + Math.floor(Math.random()*59)).slice(-2);
    var secs = ("0" + Math.floor(Math.random()*59)).slice(-2);
    var out = mins + ":" + secs;
    return out;
}

/**
 * Generates random viewcount
 */
function genViews() {
    var views = Math.floor(Math.random()*1000000);
    views = views.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    var out = views + " views";
    return out;
}

/**
 * Generates random channel name
 */
function genName() {
    var fs = require("fs");
    var text = fs.readFileSync("./names.txt");
    var names = text.toString().split("\r\n");
    var name = names[Math.floor(Math.random()*names.length)] + names[Math.floor(Math.random()*names.length)];
    return name;
}

/**
 * Generates our image
 */
async function genImg() {
    var titleObj = genTitle();
    var title = wordWrap(titleObj.title, 18);
    var keywords = titleObj.keywords;
    var time = genTime();
    var views = genViews();
    var name = genName();

    console.log(title);

    var pic; // getting thumbnail
    for (var i = 0; i < keywords.length; i++) {
        let response = await unsplash.photos.getRandomPhoto({ query: keywords[i] })
        .then(res=>res.json())
        .then(json => {
            return json;
        });
        if (!response.errors) { // no images returned
            pic = response;
            break;
        }
    }
    if (pic == null) { // if keywords return no images, random photo
        pic = await unsplash.photos.getRandomPhoto({})
        .then(res=>res.json())
        .then(json => {
            return json;
        });
    }

    var fs = require('fs'),
    request = require('request');
    const sharp = require('sharp');

    await request(pic.urls.regular)
    .pipe(fs.createWriteStream('thumb.jpg')) // downloading image
    .on('close', async function() {
        console.log('thumbnail downloaded')
        await sharp('thumb.jpg').resize({ height: 360, width: 640 }).toFile('thumbResize.jpg'); // resizing
        console.log('thumbnail resized');

        const { createCanvas, loadImage } = require('canvas');
        const canvas = createCanvas(1250, 380);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#F1F1F1';
        ctx.fillRect(0, 0, 1250, 380);

        await loadImage('thumbResize.jpg').then((image) => {
            ctx.drawImage(image, 10, 10);
        });

        ctx.fillStyle = 'black';
        ctx.font = '55px Arial';
        ctx.fillText(title, 670, 70);

        var displacement = (countLines(title) * 55) + 85;
        ctx.fillStyle = 'grey';
        ctx.font = '40px Arial';
        ctx.fillText(name, 675, displacement);
        ctx.fillText(views, 675, displacement + 55)

        ctx.fillStyle = 'black';
        ctx.globalAlpha = 0.8;
        ctx.fillRect(560, 320, 80, 40);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 27px Arial';
        ctx.fillText(time, 565, 350);

        var buf = canvas.toBuffer();
        fs.writeFileSync('out.png', buf);

        console.log('image generated');
    })
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

/**
 * Counts number of lines in a string
 */
function countLines(str) {
    var count = 1;
    for (var i = 0; i < str.length; i++) {
        if (str.charAt(i) == '\n') {
            count++;
        }
    }
    return count;
}

/**
 * Posts image, generates next one for next time
 */
async function postImg() {
    try {
        var FormData = require('form-data');
        var fs = require('fs');
        var form = new FormData();
        form.append('access_token', TOKEN);
        form.append('source', fs.createReadStream("./out.png"));
        let response = await fetch(`https://graph.facebook.com/${PAGE_ID}/photos`, {
            body: form,
            method: 'post'
        });
        response = await response.json();
        console.log(response);
        genImg();
    } catch (error) {
        console.log(error);
    }
}



/**
 * Image upload, scheduled for every 3 hours
 */
const task = cron.schedule("0 */3 * * *", () => {
    postImg();
});

task.start();