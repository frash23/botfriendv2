"use strict";

// Please confirm these files are present before running!

/*********************************************
 * Load configuration files and dependencies *
 *********************************************/
var config = require('./config.json');
var statusText = require('./statustext.json');
var keys = require("./login.json");

var Slack = require('slack-client');
var google = require('googleapis');
var request = require('request');
var imgur = require('imgur');
var tumblrjs = require('tumblr.js');
var cleverbot = require('cleverbot');
var exec = require('child_process').exec;

var chatAdmins = config.admins;
var autoMark, autoReconnect, slack, token, channel;
var customsearch = google.customsearch('v1');
var enabledAPIs = {
	google: config.apigoogle,
	tumblr: config.apitumblr,
	imgur: config.apiimgur,
	cleverbot: config.apicleverbot,
	yt: config.apiyt
}

var CX = keys.cx;		// Google API stuff
var API_KEY = keys.api;	// Because who has time for self-explanantory variable names?



/*******************
 * Initialize APIs *
 *******************/
imgur.setClientId(keys.imgurid);

var tumblr = tumblrjs.createClient({
	consumer_key: keys.tumblr_ck,
	consumer_secret: keys.tumblr_cs,
	token: keys.tumblr_t,
	token_secret: keys.tumblr_ts
});

var bot = new cleverbot(keys.cbuser, keys.cbapi);
bot.setNick(config.botname);

token = keys.token;
autoReconnect = true;
autoMark = true;
var slack = new Slack(token, autoReconnect, autoMark);
slack.on('open', function() {
	
	/* Get channels in team */
	var channels = [];
	var allChan = slack.channels;
	for(let id in allChan) {
		var channel = allChan[id];
		if(channel.is_member) channels.push("#" + channel.name);
	}

	/* Get groups in team */
	var groups = [];
	var allGrp = slack.groups;
	for(let id in allGrp) {
		var group = allChan[id];
		if(group.is_open && !group.is_archived) groups.push(group.name);
	}

	/* Status output on startup */
	var unreads = slack.getUnreadCount();
	var messages = unreads === 1 ? 'message' : 'messages';
	
	console.log('Welcome to Slack. You are @' + slack.self.name + ' of ' + slack.team.name);
	console.log('You are in: ' + channels.join(', '));
	console.log('As well as: ' + groups.join(', '));
	
	return console.log('You have ' + unreads + ' unread ' + messages);
});



/*********************
 * Utility functions *
 *********************/

/* Generate a random integer in a range */
function randomInt(min, max) {
	return Math.floor( Math.random() * (max - min + 1) + min);
}

/* Gets random user from the memebrs of a given channel */
function randomUser(channel) {
	var members = channel.members;
	var selectedMember = randomRange(0, members.length - 1);

	return slack.getUserByID(members[selectedMember]);
}

/* Gets a random entry from derpibooru with provided tag(s), aut-appends "sfw" or "explicit" tag
 * depending on the value of (boolean)sfw */
function derpi(term, channel, sfw) {
	var apiUrl = 'http://derpibooru.org/search.json?q=' + searchString + '&key=' + keys.derpi;
	
	var searchString = term.replace(/ /g, '+');
	searchString += sfw? ',sfw' : ',explicit';
	
	var xhr = new XMLHttpRequest();
	xhr.open('GET', apiUrl, false);
	xhr.onload = function() {
		var imgRes = JSON.parse(xhr.responseText).search;
		var imgNum = randomInt(0, imgRes.length - 1);

		if(imgRes.length < 1) channel.send('Uh oh! No images found.');
		else {
			var img = imgRes.length === 1? imgRes[0] : imgRes[imgNum];
			channel.send('http:' + img.image);
		}
	};
	xhr.send(null);
}

/* Gets image from e621 with provided tags */
function e621(term, channel) {
	var apiUrl = 'http://e621.net/post/index.json?tags=' + term;
	var xhr = new XMLHttpRequest();
	xhr.open('GET', apiUrl, false9;
	xhr.onload = function() {
		var imgRes = JSON.parse(body);
		var imgNum = randomRange(0, imgRes.length - 1);

		if(imgRes.length < 1) channel.send('Uh oh! No images found.');
		else {
			var img = imgRes.length === 1? imgRes[0] : imgRes[imgNum];
			channel.send(img.file_url);
		}
	};
	xhr.send(null);
}

/* Gets image from MyLittleFaceWhen with provided tags */
var mlfw = function(term, channel) {
	var apiUrl = 'http://mylittlefacewhen.com/api/v2/face/?search=["' + term + '"]&limit=10&format=json';
	var xhr = new XMLHttpRequest();
	xhr.open('GET', apiUrl, false);
	xhr.onload = function() {
		var imgRes = JSON.parse(body);
		var faceNum = randomRange(0, imgRes.meta.limit - 1);

		if(imgRes.meta.total_count < 1) channel.send('Uh oh! No images found.');
		else {
			var face = imgRes.meta.total_count === 1? imgRes.objects[0] : imgRes.objects[faceNum];
			channel.send('http://mylittlefacewhen.com' + face.image);
		}
	};
};

// Picks random image from tumblr dashboard, posts to given channel.
// If you're wondering why it says "anime" everywhere, I give you a hamburger.
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
		while ( usedAnimeImgs.indexof(imgs[imgNum]) > -1 ) {
			imgNum = randomRange(0, imgs.length - 1);
		}
		usedAnimeImgs.push(imgs[imgNum]);
		chan.send(imgs[imgNum]);
	});
}

// update bot code via git pull - this function will not restart the bot.
var updateGit = function(channel) {
	try {
		exec('git pull');
		return 'I\'ve updated my code.';
	} catch(e) {
		return 'Uh oh! Something went wrong with the update.';
	}
};

var commandLibrary = [{
	name: ['bothelp'],
	desc: 'Displays all commands',
	func: function() {
		var helpString = '\n=-=-~-=-=-~-=-=\n';
		for (var helpIndex = 0; helpIndex < commandLibrary.length; helpIndex++) {
			helpString += commandLibrary[helpIndex].name[0] + ' - ' + commandLibrary[helpIndex].desc + '\n';
		}
		helpString += '=-=-~-=-=-~-=-=';
		channel.send(helpString);
	}
}, {
	name: ['anime', 'ranimu'],
	desc: 'Displays cute anime girls',
	func: function() {
		if (channel.name == 'shitposting') {
			if (enabledAPIs.tumblr) {
				if (randomRange(0, 100) == 42) {
					channel.send("jacob go outside or something");
				} else {
					tumblrAnime(channel);
				}
			} else {
				channel.send("Error: tumblr API not enabled");
			}
		} else {
			channel.send("Take it to #shitposting dammit");
		}
	}
}, {
	name: ['api'],
	desc: 'Check or set APIs. Usage: `api <api> [true|false]',
	func: function() {
		if (textArgs.length == 2) {
			if (enabledAPIs[textArgs[1].toLowerCase()] != undefined) {
				channel.send("API '" + textArgs[1].toLowerCase() + "' is '" + enabledAPIs[textArgs[1].toLowerCase()] + "'.");
			} else {
				channel.send("Error: API '" + textArgs[1].toLowerCase() + "' doesn't exist.");
			}
		} else if (textArgs.length > 2) {
			if (chatAdmins.indexOf(user.name) > -1) {
				if (textArgs[2].toLowerCase() != "true" && textArgs[2].toLowerCase() != "false") {
					channel.send("Error: invalid arguments.");
				} else {
					if (textArgs[2].toLowerCase() == "true") {
						enabledAPIs[textArgs[1].toLowerCase()] = true;
					} else {
						enabledAPIs[textArgs[1].toLowerCase()] = false;
					}
					channel.send("API '" + textArgs[1].toLowerCase() + "' is now set to '" + textArgs[2].toLowerCase() + "'.");
				}
			} else {
				channel.send("Error: you are not an administrator!");
			}
		} else {
			channel.send("Error: not enough arguments");
		}
	}
}, {
	name: ['boop'],
	desc: 'Boops a given target.',
	func: function() {
		if (textArgs.length < 2) {
			channel.send(userName + " wants to boop someone, but didn't specify a target! They boop themselves.");
		} else {
			channel.send(userName + " gently touches " + text.substring(5, text.length + 1) + "'s nose. Boop!");
		}
	}
}, {
	name: ['botupdate'],
	desc: 'Update my code!',
	func: function() {
		if (chatAdmins.indexOf(user.name) > -1) {
			channel.send(updateGit());
			channel.send('Going down for restart now...');
			process.exit(1);
		} else {
			"Error: you are not an administrator!";
		}
	}
}, {
	name: ['cb', 'cleverbot'],
	desc: 'Talk to me!',
	func: function() {
		if (enabledAPIs.cleverbot) {
			if (textArgs.length < 2) {
				channel.send("Error: no message given.");
			} else {
				bot.create(function(err, session) {
					console.log("Asking Cleverbot...");
					bot.ask(text.substring(3, text.length + 1), function(err, response) {
						console.log("Received response:\n" + response);
						channel.send(response);
					});
				});
			}
		} else {
			channel.send("Error: cleverbot API not enabled");
		}
	}
}, {
	name: ['e621', 'e6'],
	desc: 'Displays an image with given tags from e621. `e6 <tags>`',
	func: function() {
		if (channel.name !== 'nsfw') {
			channel.send('Perhaps you are in the wrong channel?');
		} else {
			if (textArgs.length < 2) {
				channel.send(userName + ' did not specify a search term.');
			} else {
				var SEARCH = text.substring(3, text.length + 1);
				e621(SEARCH, channel);
			}
		}
	}
}, {
	name: ['derpi'],
	desc: 'Displays an image with given tags from Derpibooru. `derpi <tags>`',
	func: function() {
		if (textArgs.length < 2) {
			channel.send(userName + ' did not specify a search term.');
		} else {
			var SEARCH = text.substring(6, text.length + 1);
			derpi(SEARCH, channel, true);
		}
	}
}, {
	name: ['derpinsfw'],
	desc: 'Displays a _naughty_ image with given tags from Derpibooru. `derpinsfw <tags>`',
	func: function() {
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
	}
}, {
	name: ['imagesearch'],
	desc: 'Displays an image from Google Images with given search term. `imagesearch <query>`',
	func: function() {
		if (enabledAPIs.google) {
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
		} else {
			channel.send("Error: google API not enabled");
		}
	}
}, {
	name: ['mlfw'],
	desc: 'Displays an image from mylittlefacewhen with given tags. `mlfw <tags>`',
	func: function() {
		if (textArgs.length < 2) {
			channel.send(userName + ' did not specify a search term.');
		} else {
			var SEARCH = text.substring(5, text.length + 1);
			mlfw(SEARCH, channel);
		}
	}
}, {
	name: ['punch'],
	desc: 'Punches a given target. `punch <target>`',
	func: function() {
		if (textArgs.length < 2) {
			channel.send(userName + " did not specify a target. " + userName + " hurt themself in their confusion!");
		} else {
			channel.send(userName + " violently slugs " + text.substring(6, text.length + 1) + ".");
		}
	}
}, {
	name: ['roulette'],
	desc: 'Spin the wheel of fate!',
	func: function() {
		var randUser = "@" + randomUser(channel).name;
		channel.send("The bottle points to <" + randUser + ">.");
	}
}, {
	name: ['sc'],
	desc: "Searches Soundcloud with a given query. `sc <query>`",
	func: function() {
		if (enabledAPIs.google) {
			var SEARCH = text.substring(3, text.length + 1);
			console.log("Searching SoundCloud for \"" + SEARCH + "\"");
			customsearch.cse.list({
				cx: CX,
				q: SEARCH + " site:soundcloud.com",
				auth: API_KEY,
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
		}
	}
}, {
	name: ['xkcd'],
	desc: 'Posts either a random xkcd comic, or the given numbered comic. `xkcd [number]`',
	func: function() {
		if (textArgs.length < 2) {
			request("http://xkcd.com/info.0.json", function(error, response, body) {
				var results = JSON.parse(body);
				if (results.num != null && results.num != undefined) {
					request("http://xkcd.com/" + randomRange(1, results.num + 1) + "/info.0.json", function(error, response, body) {
						var results = JSON.parse(body);
						if (results.img != undefined && results.img != null) {
							channel.send(results.img);
						} else {
							channel.send("Error: comic does not exist with this number.");
						}
					});
				} else {
					channel.send("Unknown error");
				}
			});
		} else if (isNaN(textArgs[1])) {
			channel.send("Error: query is not a valid number.");
		} else {
			request("http://xkcd.com/" + textArgs[1] + "/info.0.json", function(error, response, body) {
				var results = JSON.parse(body);
				if (results.img != undefined && results.img != null) {
					channel.send(results.img);
				} else {
					channel.send("Error: comic does not exist with this number.");
				}
			});
		}
	}
}, {
	name: ['youtube', 'yt'],
	desc: 'Displays a video from YouTube with given search parameters. `yt <query>`',
	func: function() {
		if (enabledAPIs.yt) {
			request('https://www.googleapis.com/youtube/v3/search?part=snippet&q=' + text.substring(3, text.length).replace(' ', '+') + '&key=' + API_KEY, function(error, response, body) {
				var results = JSON.parse(body).items;
				var chosenResult = 0;
				while (results[chosenResult].id.kind != 'youtube#video') {
					chosenResult++;
				}
				channel.send('https://www.youtube.com/watch?v=' + results[chosenResult].id.videoId);
			});
		} else {
			channel.send("Error: youtube API not enabled");
		}
	}
}];

var textArgs;
var channelError, channelName, errors, response, text, textError, ts, type, typeError, user, userName;
// Message parsing
setTimeout(function() {
	process.exit(0);
}, 1800000)
slack.on('message', function(message) {
	channel = slack.getChannelGroupOrDMByID(message.channel);
	user = slack.getUserByID(message.user);
	response = '';
	type = message.type, ts = message.ts, text = message.text;
	channelName = (channel != null ? channel.is_channel : void 0) ? '#' : '';
	channelName = channelName + (channel ? channel.name : 'UNKNOWN_CHANNEL');
	userName = (user != null ? user.name : void 0) != null ? "@" + user.name : "UNKNOWN_USER";
	console.log("Received: " + type + " " + channelName + " " + userName + " " + ts + " \"" + text + "\"");
	if (type === 'message' && (text != null) && (channel != null)) {
		textArgs = text.split(' ');
		var cmd = textArgs[0].toLowerCase();
		for (var wowLoopI = 0; wowLoopI < commandLibrary.length; wowLoopI++) {
			for (var wowLoopJ = 0; wowLoopJ < commandLibrary[wowLoopI].name.length; wowLoopJ++) {
				if (cmd == commandLibrary[wowLoopI].name[wowLoopJ]) {
					commandLibrary[wowLoopI].func();
					return 0;
				}
			}
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
