(function() {
    var Slack, autoMark, autoReconnect, slack, token;
    Slack = require('slack-client');
    var google = require('googleapis');
    var customsearch = google.customsearch('v1');
    var request = require('request');
    var keys = require("./login.json"); // supr sekwet api kes
    require('shelljs/global');
    var imgur = require('imgur');
    imgur.setClientId('c2b78422ed47e75');
    var cuteimgActive = false;
    var statusActive = false;
    var tumblrjs = require('tumblr.js');
    var tumblr = tumblrjs.createClient({
        consumer_key: keys.tumblr_ck,
        consumer_secret: keys.tumblr_cs,
        token: keys.tumblr_t,
        token_secret: keys.tumblr_ts
    });
    var statusText = require('./statustext.json');

    var usedAnimeImgs = [];
    var lennyfaces = [
        'http://i.imgur.com/nu5c8bI.jpg',
        'http://i.imgur.com/cWM4TnQ.jpg',
        'http://i.imgur.com/TBptYTI.png',
        'http://i.imgur.com/mY4dHo7.png',
        'http://i.imgur.com/SK56o6J.jpg',
        'http://i.imgur.com/MB8Tih4.gif',
        'http://i.imgur.com/un7uu69.png'
    ];

    // google keys
    const CX = keys.cx;
    const API_KEY = keys.api;

    token = keys.token;
    autoReconnect = true;
    autoMark = true;
    slack = new Slack(token, autoReconnect, autoMark);

    // Execute on connect to Slack
    slack.on('open', function() {
        var channel, channels, group, groups, id, messages, unreads;
        channels = [];
        groups = [];
        unreads = slack.getUnreadCount();
        channels = (function() {
            var ref, results;
            ref = slack.channels;
            results = [];
            for (id in ref) {
                channel = ref[id];
                if (channel.is_member) {
                    results.push("#" + channel.name);
                    var link = '';

                    /* :c
                    if (channel.name === "off-topic") {
                        var generateStatus = function(channel) {
                            var statusType = randomRange(1, 3); // [min, max)

                            var usedName = statusText.names[randomRange(0, statusText.names.length - 1)];
                            var finalStatus = "Error making status message.";

                            if (statusType === 1) { // postname text
                                var usedSText = statusText.postname[randomRange(0, statusText.postname.length - 1)];
                                finalStatus = usedName + usedSText;
                            } else { // prename text
                                var usedSText = statusText.prename[randomRange(0, statusText.prename.length - 1)];
                                finalStatus = usedSText + usedName + ".";
                            }

                            channel.send(finalStatus);
                        }

                        if (!cuteimgActive) {
                            setInterval(postImage(channel, 'https://i.imgur.com/ypuqzgh.png'), 43200000);
                            cuteimgActive = true;
                        }

                        if (!statusActive) {
                            generateStatus(channel);
                            setInterval(generateStatus, 1800000, channel);
                            statusActive = true;
                        }
                    }*/
                }
            }
            return results;
        })();
        groups = (function() {
            var ref, results;
            ref = slack.groups;
            results = [];
            for (id in ref) {
                group = ref[id];
                if (group.is_open && !group.is_archived) {
                    results.push(group.name);
                }
            }
            return results;
        })();
        console.log("Welcome to Slack. You are @" + slack.self.name + " of " + slack.team.name);
        console.log('You are in: ' + channels.join(', '));
        console.log('As well as: ' + groups.join(', '));
        messages = unreads === 1 ? 'message' : 'messages';
        return console.log("You have " + unreads + " unread " + messages);
    });

    /*
     *   GENERAL USAGE AND COMMAND FUNCTIONS
     */

    Array.prototype.contains = function(k) {
        for (p in this) {
            if (this[p] === k) return true;
            return false;
        }
    }

    // gets image from derpibooru with given tags, posts to given channel
    var derpi = function(term, channel, sfw) {
        if (sfw) {
            var searchString = term.replace(' ', '+') + ',safe';
        } else {
            var searchString = term.replace(' ', '+') + ',explicit';
        }
        request('http://derpibooru.org/search.json?q=' + searchString + '&key=' + keys.derpi, function(err, res, body) {
            var imgJson = JSON.parse(body);
            var imgNum = randomRange(0, imgJson.search.length - 1);
            if (imgJson.search.length == 0) {
                channel.send("Uh oh! No images found.");
            } else if (imgJson.search.length == 1) {
                imgNum = 0;
                channel.send('http:' + imgJson.search[imgNum].image);
            } else {
                channel.send('http:' + imgJson.search[imgNum].image);
            }
        });
    }

    var e621 = function(term, channel) {
        request('http://e621.net/post/index.json?tags=' + term, function(err, res, body) {
            var imgJson = JSON.parse(body);
            var imgNum = randomRange(0, imgJson.length - 1);
            if (imgJson.length == 0) {
                channel.send("Uh oh! No images found.");
            } else if (imgJson.length == 1) {
                imgNum = 0;
                channel.send(imgJson[imgNum].file_url);
            } else {
                channel.send(imgJson[imgNum].file_url);
            }
        });
    }

    var danbooru = function(term, channel) {
        request('http://danbooru.donmai.us/posts.json?tags=' + term, function(err, res, body) {
            var imgJson = JSON.parse(body);
            var imgNum = randomRange(0, imgJson.length - 1);
            if (imgJson.length == 0) {
                channel.send("Uh oh! No images found.");
            } else if (imgJson.length == 1) {
                imgNum = 0;
                channel.send("http://danbooru.donmai.us" + imgJson[imgNum].file_url);
            } else {
                channel.send("http://danbooru.donmai.us" + imgJson[imgNum].file_url);
            }
        });
    }

    // returns random int within range
    // [min, max)
    var randomRange = function(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    var mlfw = function(term, channel) {
        var qterm = "\"" + term + "\"";
        request('http://mylittlefacewhen.com/api/v2/face/?search=[' + qterm + ']&limit=10&format=json', function(error, response, body) {
            var imgJson = JSON.parse(body);
            var faceNum = randomRange(0, imgJson.meta.limit - 1);
            if (imgJson.meta.total_count == 0) {
                channel.send("Uh oh! No images found.");
            } else if (imgJson.meta.total_count == 1) {
                faceNum = 0;
                channel.send('http://mylittlefacewhen.com' + imgJson.objects[faceNum].image);
            } else {
                channel.send('http://mylittlefacewhen.com' + imgJson.objects[faceNum].image);
            }
        });
    };

    // posts given image to imgur and links in given channel
    var postImage = function(channel, img) {
        imgur.uploadUrl(img)
            .then(function(json) {
                channel.send(json.data.link);
            })
            .catch(function(err) {
                channel.send(err.message);
            });
    };

    var randomUser = function(channel) {
        var members = channel.members;
        var selectedMember = randomRange(0, members.length - 1);
        return slack.getUserByID(members[selectedMember]);
    };

    var tumblrAnime = function(chan) {
        tumblr.dashboard({
            limit: 25,
            type: 'photo'
        }, function(err, data) {
            var posts = data.posts;
            var imgs = [];
            for (var i = 0, l = posts.length; i < l; i++) imgs.push(posts[i].photos[0].original_size.url);
            var imgNum = randomRange(0, imgs.length - 1);
            if (usedAnimeImgs.length == 25) {
                usedAnimeImgs = [];
            }
            while (usedAnimeImgs.contains(imgs[imgNum])) {
                imgNum = randomRange(0, imgs.length - 1);
            }
            usedAnimeImgs.push(imgs[imgNum]);
            chan.send(imgs[imgNum]);
        });
    }

    // update bot code via git pull
    var updateGit = function(channel) {
        if (exec('git pull https://techniponi@bitbucket.org/techniponi/botfriend.git').code !== 0) {
            return 'Uh oh! Something went wrong with the update.';
        } else {
            return 'I\'ve updated my code.';
        }
    };

    /*
     *   MESSAGE HANDLER
     */

    slack.on('message', function(message) {
        var channel, channelError, channelName, errors, response, text, textError, ts, type, typeError, user, userName;
        channel = slack.getChannelGroupOrDMByID(message.channel);
        user = slack.getUserByID(message.user);
        response = '';
        type = message.type, ts = message.ts, text = message.text;
        channelName = (channel != null ? channel.is_channel : void 0) ? '#' : '';
        channelName = channelName + (channel ? channel.name : 'UNKNOWN_CHANNEL');
        userName = (user != null ? user.name : void 0) != null ? "@" + user.name : "UNKNOWN_USER";
        console.log("Received: " + type + " " + channelName + " " + userName + " " + ts + " \"" + text + "\"");
        if (type === 'message' && (text != null) && (channel != null)) {
            var textArgs = text.split(' ');
            var cmd = textArgs[0].toLowerCase();
            switch (cmd) {
                // general commands
                case 'bothelp':
                    var helpString = "";
                    helpString += "================\n";
                    helpString += "BOT FRIEND HELP:\n";
                    helpString += "-----\n";
                    helpString += "Commands:\n";
                    helpString += "- anime\n";
                    helpString += "- boop <target>\n";
                    helpString += "- botupdate\n";
                    helpString += "- dan <search query>\n";
                    helpString += "- e6 <search query>\n";
                    helpString += "- derpi <search query>\n";
                    helpString += "- derpinsfw <search query>\n";
                    helpString += "- icebucket <target>\n";
                    helpString += "- imagesearch <search query>\n";
                    helpString += "- lenny\n";
                    helpString += "- mlfw <search query>\n";
                    helpString += "- noot\n";
                    helpString += "- penis\n";
                    helpString += "- poop\n";
                    helpString += "- punch <target>\n";
                    helpString += "- roulette\n";
                    helpString += "- unpunch <target>\n";
                    helpString += "- yt <search query>\n";
                    helpString += "-----\n";
                    helpString += "Any ideas or suggestions? Tell @techniponi!\n";
                    helpString += "================";
                    channel.send(helpString);
                    break;

                case 'ranimu':
                case 'anime':
                    if (randomRange(0, 100) == 42) {
                        channel.send("jacob go outside or something");
                        break;
                    } else {
                        tumblrAnime(channel);
                        break;
                    }

                case 'boop': // allows the user to boop a target
                    if (textArgs.length < 2) {
                        channel.send(userName + " wants to boop someone, but didn't specify a target! They boop themself.");
                    } else {
                        channel.send(userName + " gently touches " + text.substring(5, text.length + 1) + "'s nose. Boop!");
                    }
                    break;

                case 'botupdate': // updates bot from git's master branch
                    channel.send(updateGit());
                    channel.send('Going down for restart now...');
                    process.exit(1);
                    break;

                    /* case 'cam':
                case 'cam!':
                case 'cameron!':
                case 'cameron':
                    channel.send('god dammit cameron');
                    break; */

                case 'dan': // searches danbooru for given tags
                    if (channel.name !== 'nsfw') {
                        channel.send('Perhaps you are in the wrong channel?');
                    } else {
                        if (textArgs.length < 2) {
                            channel.send(userName + ' did not specify a search term.');
                        } else {
                            var SEARCH = text.substring(4, text.length + 1);
                            //derpi(SEARCH, channel, true);
                            danbooru(SEARCH, channel);
                        }
                    }
                    break;

                case 'e6': // searches e621 for given tags
                    if (channel.name !== 'nsfw') {
                        channel.send('Perhaps you are in the wrong channel?');
                    } else {
                        if (textArgs.length < 2) {
                            channel.send(userName + ' did not specify a search term.');
                        } else {
                            var SEARCH = text.substring(3, text.length + 1);
                            //derpi(SEARCH, channel, true);
                            e621(SEARCH, channel);
                        }
                    }
                    break;

                case 'derpi': // searches derpibooru for given tags
                    if (textArgs.length < 2) {
                        channel.send(userName + ' did not specify a search term.');
                    } else {
                        var SEARCH = text.substring(6, text.length + 1);
                        derpi(SEARCH, channel, true);
                    }
                    break;

                case 'derpinsfw': // searches derpibooru for given tags
                    if (channel.name !== 'nsfw') {
                        channel.send('Perhaps you are in the wrong channel?');
                    } else {
                        if (textArgs.length < 2) {
                            channel.send(userName + ' did not specify a search term.');
                        } else {
                            var SEARCH = text.substring(10, text.length + 1);
                            derpi(SEARCH, channel, false);
                        }
                    }
                    break;

                case 'icebucket': // WAKE UP FAG
                    if (textArgs.length < 2) {
                        channel.send(userName + " did not specify a target. " + userName + " hurt themself in their confusion!");
                    } else {
                        channel.send(userName + " dumps a bucket of cold ice over " + text.substring(10, text.length + 1) + ".");
                    }
                    break;

                case 'imgsearch':
                case 'imagesearch': // Posts first result from Google Images
                    var SEARCH = text.substring(12, text.length + 1);
                    console.log("Searching Google Images for \"" + SEARCH + "\"");
                    customsearch.cse.list({
                        cx: CX,
                        q: SEARCH,
                        auth: API_KEY,
                        searchType: 'image'
                    }, function(err, resp) {
                        if (err) {
                            console.log('An error occured', err);
                            return;
                        }
                        var imgResult = randomRange(0, 9);
                        if (resp.items && resp.items.length > 0) {
                            channel.send(resp.items[imgResult].link); // post to channel
                        }
                    });
                    break;

                case 'lenny':
                    postImage(channel, lennyfaces[randomRange(0, lennyfaces.length - 1)]);
                    break;

                case 'rofl':
                case 'lmao':
                case 'roflmao':
                case 'lul':
                case 'ha':
                case 'lol':
                    channel.send('roflmao lol lmao ololololol :D XDDDDD that\'s fucking hilarious');
                    break;

                case 'mlfw': // searches mlfw with given tag
                    if (textArgs.length < 2) {
                        channel.send(userName + ' did not specify a search term.');
                    } else {
                        var SEARCH = text.substring(5, text.length + 1);
                        mlfw(SEARCH, channel);
                    }
                    break;

                case 'noot': // NOOT NOOT
                    channel.send("https://www.youtube.com/watch?v=8k97_ClPi50");
                    break;

                case 'penis': // reminds the chat of the true dongner lord
                    channel.send('CAMERON HAS THE LONGER DONGER');
                    break;

                case 'pls': // cam pls
                    channel.send('pls');
                    break;

                case 'poop': // you sick fuck
                    channel.send('Ha ha. Poop. That is some real mature, adult humor.');
                    break;

                case 'punch': // allows the sender to gently caress whatever is specified as arguments
                    if (textArgs.length < 2) {
                        channel.send(userName + " did not specify a target. " + userName + " hurt themself in their confusion!");
                    } else {
                        channel.send(userName + " violently slugs " + text.substring(6, text.length + 1) + ".");
                    }
                    break;

                case 'roulette': // picks a random user
                    var randUser = "@" + randomUser(channel).name;
                    channel.send("The bottle points to <" + randUser + ">.");
                    break;

                case 'unpunch': // reverses time to undo a user's punch
                    if (textArgs.length < 2) {
                        channel.send(userName + " did not specify a target. " + userName + " is now a snail for the next seven and a half minutes.");
                    } else {
                        channel.send(userName + " turns back time to reverse his act of aggression against " + text.substring(8, text.length + 1) + ".");
                    }
                    break;

                case 'yt': // posts the first youtube result with given query
                    request('https://www.googleapis.com/youtube/v3/search?part=snippet&q=' + text.substring(3, text.length).replace(' ', '+') + '&key=' + API_KEY, function(error, response, body) {
                        var results = JSON.parse(body).items;
                        var chosenResult = 0;
                        while (results[chosenResult].id.kind != 'youtube#video') {
                            chosenResult++;
                        }
                        channel.send('https://www.youtube.com/watch?v=' + results[chosenResult].id.videoId);
                    });
                    break;
            }
        } else {
            typeError = type !== 'message' ? "unexpected type " + type + "." : null;
            textError = text == null ? 'text was undefined.' : null;
            channelError = channel == null ? 'channel was undefined.' : null;
            errors = [typeError, textError, channelError].filter(function(element) {
                return element !== null;
            }).join(' ');
            return console.log("@" + slack.self.name + " could not respond. " + errors);
        }
    });

    slack.on('error', function(error) {
        return console.error("Error: " + error);
    });

    slack.login();

}).call(this);