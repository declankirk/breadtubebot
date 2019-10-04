/**
 * VIDEO ESSAY BOT
 * 
 * Author: Declan Kirk
 * Created: 08/09/2019
 * 
 * Posts hypothetical YouTube video essays every 3 hours.
 * 
 * Version 1.2.2
 */

const config = require('./config.json');

const PAGE_ID = config.facebook.page_id;
const TOKEN = config.facebook.token;
const FB = require('fb');
FB.setAccessToken(TOKEN);

const Twitter = require('twit');
const T = new Twitter(config.twitter);

const cron = require('node-cron');
global.fetch = require('node-fetch');

/**
 * Generates random title
 */
function genTitle() {
    var fs = require('fs');
    var text = fs.readFileSync('./templates.txt');
    var templates = text.toString().split('\r\n');
    text = fs.readFileSync('./nouns.txt');
    var nouns = text.toString().split('\r\n');
    text = fs.readFileSync('./adjectives.txt');
    var adjectives = text.toString().split('\r\n');

    var template = templates[Math.floor(Math.random()*templates.length)];
    var out = '';
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
        'title': out,
        'keywords': keywords
    }

    return ret;
}

/**
 * Generates random video length
 */
function genTime() {
    var mins = ('0' + Math.floor(Math.random()*59)).slice(-2);
    var secs = ('0' + Math.floor(Math.random()*59)).slice(-2);
    var out = mins + ':' + secs;
    return out;
}

/**
 * Generates random viewcount
 */
function genViews() {
    var views = Math.floor(Math.random()*1000000);
    views = views.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var out = views + ' views';
    return out;
}

/**
 * Generates random channel name
 */
function genName(upload) {
    var fs = require('fs');
    var text1 = fs.readFileSync('./names1.txt');
    var text2 = fs.readFileSync('./names2.txt');
    var names1 = text1.toString().split('\r\n');
    var names2 = text2.toString().split('\r\n');
    var name = names1[Math.floor(Math.random()*names1.length)] + names2[Math.floor(Math.random()*names2.length)];
    return name;
}

/**
 * Generates our images (formatted for facbook and twitter) and posts em
 */
async function genImg(upload) {
    var titleObj = genTitle();
    var title = titleObj.title;
    var titleWrap = wordWrap(title, 19);
    var keywords = titleObj.keywords;
    var time = genTime();
    var views = genViews();
    var name = genName();

    console.log();
    console.log(title);

    let {PythonShell} = require('python-shell');
    let options = {
        mode: 'text',
        pythonOptions: ['-u'],
        args: keywords
    };

    PythonShell.run('fetch.py', options, async function (err, results) {
        if (err) {
            console.log('SPB/PYTHON ERROR');
            console.log(err);
            return;
        };
        console.log('THUMBNAIL DOWNLOADED');
        console.log(results);

        var fs = require('fs');

        // FACEBOOK IMG

        const { createCanvas, loadImage } = require('canvas');
        var canvas = createCanvas(1250, 380);
        var ctx = canvas.getContext('2d');

        ctx.fillStyle = '#F1F1F1';
        ctx.fillRect(0, 0, 1250, 380);

        ctx.fillStyle = 'white';
        ctx.fillRect(10, 10, 640, 360);
        
        await loadImage('thumb.jpg').then((image) => {
            ctx.drawImage(image, 10, 10, 640, 360); // stretch
        });
        
        ctx.fillStyle = 'black';
        ctx.font = '55px Arial';
        ctx.fillText(titleWrap, 670, 70);

        var displacement = (countLines(titleWrap) * 55) + 85;
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
        console.log('FB IMAGE GENERATED');

        // TWITTER IMG

        canvas = createCanvas(640, 360);
        ctx = canvas.getContext('2d');

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 640, 360);

        await loadImage('thumb.jpg').then((image) => {
            ctx.drawImage(image, 0, 0, 640, 360);
        });

        ctx.fillStyle = 'black';
        ctx.globalAlpha = 0.8;
        ctx.fillRect(550, 310, 80, 40);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 27px Arial';
        ctx.fillText(time, 555, 340);

        buf = canvas.toBuffer();
        fs.writeFileSync('outTwitter.png', buf);
        console.log('TWITTER IMAGE GENERATED');
        if (upload) {
            try {
                // POSTING TO FACEBOOK
                var FormData = require('form-data');
                var form = new FormData();
                form.append('access_token', TOKEN);
                form.append('source', fs.createReadStream('./out.png'));
                form.append('message', 'Up next:');
                let response = await fetch(`https://graph.facebook.com/${PAGE_ID}/photos`, {
                    body: form,
                    method: 'post'
                });
                response = await response.json();
                console.log("POSTED TO FACEBOOK");
                // console.log(response);
    
                // POSTING TO TWITTER
                var twitMsg = title + " | " + name + "\n\n" + views;
                var b64img = fs.readFileSync('./outTwitter.png', { encoding: 'base64' });
                T.post('media/upload', { media_data: b64img }, function (err, data, response) {
                    var mediaIdStr = data.media_id_string
                    var altText = "video"
                    var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } }
                
                    T.post('media/metadata/create', meta_params, function (err, data, response) {
                        if (!err) {
                            var params = { status: twitMsg, media_ids: [mediaIdStr] }
                            T.post('statuses/update', params, function (err, data, response) {
                                console.log("POSTED TO TWITTER")
                                // console.log(data);
                            })
                        }
                    })
                });
            } catch(error) { // catch network issues
                console.log("UPLOAD FAILED")
                console.log(error);
            }
        }
    }.bind({upload:upload}));
}

/**
 * Wraps text string for img formatting
 * Stolen from https://stackoverflow.com/questions/14484787/wrap-text-in-javascript
 */
function wordWrap(str, maxWidth) {
    var newLineStr = '\n'; done = false; res = '';
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


const task = cron.schedule('0 */3 * * *', () => { // post scheduled for every 3 hours
    genImg(true);
});

var args = process.argv.slice(2);
if (args.length < 1) {
    console.log("Starting post scheduling...");
    task.start();
} else if (args.length == 1 && args[0] == "-m") {
    console.log("Posting manually...");
    genImg(true);
} else if (args.length == 1 && args[0] == "-t") {
    console.log("Generating test image...");
    genImg(false);
} else {
    console.log("Usage: node bot.js [-m|-t]");
    process.exit();
}