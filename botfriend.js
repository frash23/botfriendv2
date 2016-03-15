// Please confirm these files are present before running!

// Load json configs
var config = require('./config.json');
var statusText = require('./statustext.json');
var keys = require("./login.json");

// Load npm modules
var Slack = require('slack-client');
require('shelljs/global');
var google = require('googleapis');
var request = require('request');
var imgur = require('imgur');
var tumblrjs = require('tumblr.js');
var cleverbot = require('cleverbot');

// Initialize runtime variables
var enabledAPIs = {
	google: config.apigoogle,
	tumblr: config.apitumblr,
	imgur: config.apiimgur,
	cleverbot: config.apicleverbot,
	yt: config.apiyt
}

var chatAdmins = config.admins;
var autoMark, autoReconnect, slack, token, channel;
var customsearch = google.customsearch('v1');
imgur.setClientId(keys.imgurid);

var tumblr = tumblrjs.createClient({
	consumer_key: keys.tumblr_ck,
	consumer_secret: keys.tumblr_cs,
	token: keys.tumblr_t,
	token_secret: keys.tumblr_ts
});

var bot = new cleverbot(keys.cbuser, keys.cbapi);
bot.setNick(config.botname);

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

var fighters = [];

// google keys
const CX = keys.cx;
const API_KEY = keys.api;

// Slack init
token = keys.token;
autoReconnect = true;
autoMark = true;
var slack = new Slack(token, autoReconnect, autoMark);

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

	// Status output on startup
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

// Gets random user from the memebrs of a given channel
var randomUser = function(channel) {
	var members = channel.members;
	var selectedMember = randomRange(0, members.length - 1);
	return slack.getUserByID(members[selectedMember]);
};

var cooldownFunc = function(fighters, ff) {
	fighters[ff].cooldown = false;
}

// gets image from derpibooru with given tags, posts to given channel - auto-appends "safe" or "explicit" tag based on argument
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

// Gets image from e621 with given tags, posts to given channel
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

// Gets image from danbooru with given tags, posts to given channel
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

// Creates a humorous status message using names of group members and lines of text in statustext.json
var generateStatus = function(channel) {
	var statusType = randomRange(1, 3); // [min, max)

	var usedName = "@" + randomUser(channel).name;
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

// returns random int within range
// [min, max)
var randomRange = function(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

// Gets image from MyLittleFaceWhen with given tags, posts to given channel
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

// posts given image URL to imgur and links in given channel
var postImage = function(channel, img) {
	imgur.uploadUrl(img)
		.then(function(json) {
			channel.send(json.data.link);
		})
		.catch(function(err) {
			channel.send(err.message);
		});
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
		while (usedAnimeImgs.contains(imgs[imgNum])) {
			imgNum = randomRange(0, imgs.length - 1);
		}
		usedAnimeImgs.push(imgs[imgNum]);
		chan.send(imgs[imgNum]);
	});
}

// update bot code via git pull - this function will not restart the bot.
var updateGit = function(channel) {
	if (exec('git pull').code !== 0) {
		return 'Uh oh! Something went wrong with the update.';
	} else {
		return 'I\'ve updated my code.';
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
	name: ['ay', 'ayy', 'ayyy', 'ayyyy', 'ayyyyy'],
	desc: 'ayyyyy',
	func: function() {
		channel.send('https://dl.dropboxusercontent.com/u/34812017/WebM/1419014839232.webm')
	}
}, {
	name: ['ey', 'eyy', 'eyyy', 'eyyyy', 'eyyyyy'],
	desc: 'eyyyyy',
	func: function() {
		channel.send('You\'re doing it wrong, Diana');
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
	name: ['battle'],
	desc: 'Battle system. Use `battle help` for in-depth explanation.',
	func: function() {
		if (textArgs.length < 2) {
			channel.send("Error: no arguments given.");
		} else {
			if (textArgs[1] == 'enter') {
				// Enter user into battle
				if (textArgs.length < 3) {
					fighters.push({
						name: userName,
						cooldown: false,
						maxhp: 50,
						hp: 50,
						attacks: [{
							name: "punch",
							damage: 5,
							timeout: 3,
							message: "$ punches *!"
						}, {
							name: "kick",
							damage: 10,
							timeout: 5,
							message: "$ kicks * in the groin!"
						}]
					});
					channel.send("You enter the arena! Stats:\nHP: " + fighters[fighters.length - 1].hp + "/" + fighters[fighters.length - 1].maxhp);
				} else {
					var targetUser = "@" + slack.getUserByID(textArgs[2].replace("<@", "").replace(">", "")).name;
					fighters.push({
						name: targetUser,
						cooldown: false,
						maxhp: 50,
						hp: 50,
						attacks: [{
							name: "punch",
							damage: 5,
							timeout: 3,
							message: "$ punches *!"
						}, {
							name: "kick",
							damage: 10,
							timeout: 5,
							message: "$ kicks * in the groin!"
						}]
					});
					channel.send(targetUser + " enters the arena! Stats:\nHP: " + fighters[fighters.length - 1].hp + "/" + fighters[fighters.length - 1].maxhp);
				}
			} else if (textArgs[1] == 'attack') {
				if (textArgs.length < 4) {
					channel.send("Error: not enough arguments");
				} else {

					var userCheck = false;
					for (var ff = 0; ff < fighters.length; ff++) {
						if (ff != fighters.length) {
							console.log("Start looking for users...");
							if (userName == fighters[ff].name) {
								userCheck = true;
								console.log("User is in battle...");
								var attackCheck = false;
								for (var fff = 0; fff < fighters[ff].attacks.length; fff++) {
									if (fff != fighters[ff].attacks.length) {
										if (textArgs[2] == fighters[ff].attacks[fff].name) {
											attackCheck = true;
											console.log("Attack is valid...");
											var targetCheck = false;
											for (var ffff = 0; ffff < fighters.length; ffff++) {
												if (ffff != fighters.length) {
													if (slack.getUserByID(textArgs[3].replace("<@", "").replace(">", "")) !== undefined) {
														var targetUser = "@" + slack.getUserByID(textArgs[3].replace("<@", "").replace(">", "")).name;
														if (targetUser == fighters[ffff].name) {
															targetCheck = true;
															console.log("Target is valid...");
															if (!fighters[ff].cooldown) {
																fighters[ffff].hp -= fighters[ff].attacks[fff].damage;
																channel.send(fighters[ff].attacks[fff].message.replace("$", fighters[ff].name).replace("*", fighters[ffff].name) + "\n" + fighters[ffff].name + " HP: " + fighters[ffff].hp + "/" + fighters[ffff].maxhp);
																fighters[ff].cooldown = true;
																setTimeout(cooldownFunc, fighters[ff].attacks[fff].timeout * 1000, fighters, ff);
															} else {
																channel.send("You are still on cooldown!");
															}
														} else {
															if (ffff == fighters.length - 1 && !targetCheck) {
																channel.send("Error: invalid target");
															}
														}
													} else {
														channel.send("Error: invalid target");
													}
												}
											}
										} else {
											if (fff == fighters[ff].attacks.length - 1 && !attackCheck) {
												channel.send("Error: invalid attack");
											}
										}
									}
								}
							} else {
								if (ff == fighters.length - 1 && !userCheck) {
									console.log("User not in battle.");
									channel.send("You aren't in battle!");
								}
							}
						}
					}
				}
			} else if (textArgs[1] == 'list') {
				var finalString = "Current contestants:\n";
				for (var pp = 0; pp < fighters.length; pp++) {
					finalString += fighters[pp].name + " HP: " + fighters[pp].hp + "/" + fighters[pp].maxhp + "\n";
				}
				channel.send(finalString);
			}
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
	name: ['cam', 'campls'],
	desc: 'Annoys Cameron.',
	func: function() {
		for (var i = 0; i <= 5; i++) {
			channel.send("@techniponi pls");
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
	name: ['dan'],
	desc: 'Display an image with given tags from Danbooru. `dan <tags>`',
	func: function() {
		if (channel.name !== 'nsfw') {
			channel.send('Perhaps you are in the wrong channel?');
		} else {
			if (textArgs.length < 2) {
				channel.send(userName + ' did not specify a search term.');
			} else {
				var SEARCH = text.substring(4, text.length + 1);
				danbooru(SEARCH, channel);
			}
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
	name: ['exec'],
	desc: 'Executes a command on the server. Admins only!',
	func: function() {
		if (textArgs.length < 2) {
			channel.send("Error: not enough arguments.");
		} else {
			if (chatAdmins.indexOf(user.name) > -1) {
				exec(text.substring(5, text.length + 1), function(err, out, code) {
					if (err == 0) {
						channel.send(out);
					} else {
						channel.send("ERROR:\n" + err);
					}
				});
			} else {
				channel.send("Error: you are not an administrator!");
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
	name: ['honk'],
	desc: 'honk it up!',
	func: function() {
		channel.send('https://www.youtube.com/watch?v=c3vONDqvayo');
	}
}, {
	name: ['icebucket'],
	desc: 'Dump ice on someone. `icebucket <target>`',
	func: function() {
		if (textArgs.length < 2) {
			channel.send(userName + " did not specify a target. " + userName + " hurt themselves in their confusion!");
		} else {
			channel.send(userName + " dumps a bucket of cold ice over " + text.substring(10, text.length + 1) + ".");
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
	name: ['kek'],
	desc: 'kekekekekek',
	func: function() {
		channel.send("https://www.youtube.com/watch?v=z8RkR4rd7dM");
	}
}, {
	name: ['lenny'],
	desc: 'ãƒ½à¼¼àºˆÙ„Íœàºˆà¼½ï¾‰',
	func: function() {
		if (enabledAPIs.imgur) {
			postImage(channel, lennyfaces[randomRange(0, lennyfaces.length - 1)]);
		} else {
			channel.send("Error: imgur API not enabled");
		}
	}
}, {
	name: ['lol', 'rofl', 'lmao', 'roflmao', 'lul', 'ha'],
	desc: 'lololol',
	func: function() {
		channel.send('roflmao lol lmao ololololol :D XDDDDD that\'s fucking hilarious');
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
	name: ['noot'],
	desc: 'NOOT NOOT',
	func: function() {
		channel.send("https://www.youtube.com/watch?v=8k97_ClPi50");
	}
}, {
	name: ['penis'],
	desc: 'penerswow',
	func: function() {
		channel.send('CAMERON HAS THE LONGER DONGER');
	}
}, {
	name: ['pls', 'please'],
	desc: 'pls',
	func: function() {
		channel.send('pls');
	}
}, {
	name: ['poop'],
	desc: '...',
	func: function() {
		channel.send('Ha ha. Poop. That is some real mature humor.');
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
	name: ['search'],
	desc: "Searches Google with a given query. `search <query>`",
	func: function() {
		if (enabledAPIs.google) {
			var SEARCH = text.substring(7, text.length + 1);
			console.log("Searching google for \"" + SEARCH + "\"");
			customsearch.cse.list({
				cx: CX,
				q: SEARCH,
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
	name: ['status'],
	desc: 'See what botriend thinks about the chat members.',
	func: function() {
		generateStatus(channel);
	}
}, {
	name: ['unpunch'],
	desc: 'Create a time paradox. Just for fun.',
	func: function() {
		if (textArgs.length < 2) {
			channel.send(userName + " did not specify a target. " + userName + " is now a snail for the next seven and a half minutes.");
		} else {
			channel.send(userName + " turns back time to reverse his act of aggression against " + text.substring(8, text.length + 1) + ".");
		}
	}
}, {
	name: ['wow'],
	desc: 'wao',
	func: function() {
		channel.send("https://www.youtube.com/watch?v=Wfl_AaYTdFQ");
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
