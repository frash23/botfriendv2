(function () {
	
	// Please confirm these files are present before running!
	
	//drew was here 3/2/16
	
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
		cleverbot: config.apicleverbot
	}

	var chatAdmins = config.admins;
	var autoMark, autoReconnect, slack, token;
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

	// google keys
	const CX = keys.cx;
	const API_KEY = keys.api;

	// Slack init
	token = keys.token;
	autoReconnect = true;
	autoMark = true;
	slack = new Slack(token, autoReconnect, autoMark);

	// Execute on connect to Slack
	slack.on('open', function () {
		var channel, channels, group, groups, id, messages, unreads;
		channels = [];
		groups = [];
		unreads = slack.getUnreadCount();
		channels = (function () {
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
		groups = (function () {
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

	Array.prototype.contains = function (k) {
		for (p in this) {
			if (this[p] === k) return true;
			return false;
		}
	}
	
	// Gets random user from the memebrs of a given channel
	var randomUser = function (channel) {
		var members = channel.members;
		var selectedMember = randomRange(0, members.length - 1);
		return slack.getUserByID(members[selectedMember]);
	};

	// gets image from derpibooru with given tags, posts to given channel - auto-appends "safe" or "explicit" tag based on argument
	var derpi = function (term, channel, sfw) {
		if (sfw) {
			var searchString = term.replace(' ', '+') + ',safe';
		} else {
			var searchString = term.replace(' ', '+') + ',explicit';
		}
		request('http://derpibooru.org/search.json?q=' + searchString + '&key=' + keys.derpi, function (err, res, body) {
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
	var e621 = function (term, channel) {
		request('http://e621.net/post/index.json?tags=' + term, function (err, res, body) {
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
	var danbooru = function (term, channel) {
		request('http://danbooru.donmai.us/posts.json?tags=' + term, function (err, res, body) {
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
	var generateStatus = function (channel) {
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
	var randomRange = function (min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}

	// Gets image from MyLittleFaceWhen with given tags, posts to given channel
	var mlfw = function (term, channel) {
		var qterm = "\"" + term + "\"";
		request('http://mylittlefacewhen.com/api/v2/face/?search=[' + qterm + ']&limit=10&format=json', function (error, response, body) {
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
	var postImage = function (channel, img) {
		imgur.uploadUrl(img)
			.then(function (json) {
				channel.send(json.data.link);
			})
			.catch(function (err) {
				channel.send(err.message);
			});
	};

	// Picks random image from tumblr dashboard, posts to given channel.
	// If you're wondering why it says "anime" everywhere, I give you a hamburger.
	var tumblrAnime = function (chan) {
		tumblr.dashboard({
			limit: 25,
			type: 'photo'
		}, function (err, data) {
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
	var updateGit = function (channel) {
		if (exec('git pull https://github.com/techniponi/botfriend.git').code !== 0) {
			return 'Uh oh! Something went wrong with the update.';
		} else {
			return 'I\'ve updated my code.';
		}
	};


	// Message parsing
	setTimeout(function(){process.exit(0);}, 1800000)
	slack.on('message', function (message) {
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
				
				// Lists all available commands
				case 'bothelp':
					var helpString = ".\n"
						+ "================\n"
						+ "BOT FRIEND HELP:\n"
						+ "-----\n"
						+ "Commands:\n"
						+ "- anime\n"
						+ "- ayyy\n"
						+ "- boop <target>\n"
						+ "- botupdate\n"
						+ "- cb <message>\n"
						+ "- dan <search query>\n"
						+ "- e6 <search query>\n"
						+ "- exec <command>\n"
						+ "- derpi <search query>\n"
						+ "- derpinsfw <search query>\n"
						+ "- icebucket <target>\n"
						+ "- imagesearch <search query>\n"
						+ "- lenny\n"
						+ "- mlfw <search query>\n"
						+ "- noot\n"
						+ "- penis\n"
						+ "- poop\n"
						+ "- punch <target>\n"
						+ "- roulette\n"
						+ "- api <api> [true|false]\n"
						+ "- status\n"
						+ "- unpunch <target>\n"
						+ "- xkcd [number]\n"
						+ "- yt <search query>\n"
						+ "-----\n"
						+ "Any ideas or suggestions? Tell @techniponi!\n"
						+ "================";
					channel.send(helpString);
					break;

				// If tumblr API integration is enabled, posts random image from Tumblr dasboard
				case 'ranimu':
				case 'anime':
				case 'I am a huge fucking weeb':
					if (enabledAPIs.tumblr) {
						if (randomRange(0, 100) == 42) {
							channel.send("jacob go outside or something");
							break;
						} else {
							tumblrAnime(channel);
							break;
						}
					} else {
						channel.send("Error: tumblr API not enabled");
						break;
					}

				// Allows any user to check the status of an API integration, and allows admins to change it temporarily.
				case 'api':
					if (textArgs.length == 2) {
						if (enabledAPIs[textArgs[1].toLowerCase()] != undefined) {
							channel.send("API '" + textArgs[1].toLowerCase() + "' is '" + enabledAPIs[textArgs[1].toLowerCase()] + "'.");
						} else {
							channel.send("Error: API '" + textArgs[1].toLowerCase() + "' doesn't exist.");
						}
					} else if (textArgs.length > 2) {
						if (chatAdmins.indexOf(user.name) > -1) {
							if (textArgs[2].toLowerCase() != "true" && textArgs[2].toLowerCase() != "false") {
								channel.send("Error: invalid argument. Correct usage: `setapi <api> [true|false]`");
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
					break;

				// AYY LMAO
				case 'ayyyyy':
				case 'ayyyy':
				case 'ayyy':
				case 'ayy':
				case 'ay':
					channel.send("https://dl.dropboxusercontent.com/u/34812017/WebM/1419014839232.webm");
					break;
					
				case 'eyyyyy':
				case 'eyyyy':
				case 'eyyy':
				case 'eyy':
				case 'ey':
					channel.send("You're doing it wrong, Diana");
					break;
					

				// Performs a 'boop' action to the given target.
				case 'boop':
					if (textArgs.length < 2) {
						channel.send(userName + " wants to boop someone, but didn't specify a target! They boop themselves.");
					} else {
						channel.send(userName + " gently touches " + text.substring(5, text.length + 1) + "'s nose. Boop!");
					}
					break;

				// Updates the bot's code from git and restarts the bot. Make sure botfriend is running via run.sh!
				case 'botupdate':
					if (chatAdmins.indexOf(user.name) > -1) {
						channel.send(updateGit());
						channel.send('Going down for restart now...');
						process.exit(1);
					} else {
						"Error: you are not an administrator!";
					}
					break;

				// If cleverbot API is enabled, sends the given message to Cleverbot and posts the response.
				case 'cb':
					if (enabledAPIs.cleverbot) {
						if (textArgs.length < 2) {
							channel.send("Error: no message given.");
						} else {
							bot.create(function (err, session) {
								console.log("Asking Cleverbot...");
								bot.ask(text.substring(3, text.length + 1), function (err, response) {
									console.log("Received response:\n" + response);
									channel.send(response);
								});
							});
						}
					} else {
						channel.send("Error: cleverbot API not enabled");
					}
					break;

				// Searches danbooru for the given tags and posts to the channel. Only works in the 'nsfw' channel.
				case 'dan':
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
					break;

				// Searches e621 for the given tags and posts to the channel. Only works in the 'nsfw' channel.
				case 'e6':
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
					break;

				// If the user is an administrator, allows them to execute a command directly on the server. Posts the output.
				case 'exec':
					if (textArgs.length < 2) {
						channel.send("Error: not enough arguments.");
					} else {
						if (chatAdmins.indexOf(user.name) > -1) {
							exec(text.substring(5, text.length + 1), function (err, out, code) {
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
					break;

				case 'derpi': // searches derpibooru for given tags
					if (textArgs.length < 2) {
						channel.send(userName + ' did not specify a search term.');
					} else {
						var SEARCH = text.substring(6, text.length + 1);
						derpi(SEARCH, channel, true);
					}
					break;

				case 'derpinsfw': // searches derpibooru for given tags (nsfw version)
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

				// Performs "ice bucket" emote on given target.
				case 'icebucket':
					if (textArgs.length < 2) {
						channel.send(userName + " did not specify a target. " + userName + " hurt themself in their confusion!");
					} else {
						channel.send(userName + " dumps a bucket of cold ice over " + text.substring(10, text.length + 1) + ".");
					}
					break;

				case 'imgsearch':
				case 'imgsrch':
				case 'imagesearch': // Posts first result from Google Images
					if (enabledAPIs.google) {
						var SEARCH = text.substring(12, text.length + 1);
						console.log("Searching Google Images for \"" + SEARCH + "\"");
						customsearch.cse.list({
							cx: CX,
							q: SEARCH,
							auth: API_KEY,
							searchType: 'image'
						}, function (err, resp) {
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
					break;

				case 'lenny':
					if (enabledAPIs.imgur) {
						postImage(channel, lennyfaces[randomRange(0, lennyfaces.length - 1)]);
					} else {
						channel.send("Error: imgur API not enabled");
					}
					break;

				case 'rofl':
				case 'lmao':
				case 'roflmao':
				case 'lul':
				case 'ha':
				case 'lol':
					channel.send('roflmao lol lmao ololololol :D XDDDDD that\'s fucking hilarious');
					break;
					
				case 'kek':
					channel.send("https://www.youtube.com/watch?v=z8RkR4rd7dM");
					break;
					
				case 'wow':
					channel.send("https://www.youtube.com/watch?v=Wfl_AaYTdFQ");
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
					
				case 'weeb': // you really are
					channel.send('Jacob and Andrew are weebs');
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
					
				case 'unpunch': // reverses time to undo a user's punch
					if (textArgs.length < 2) {
						channel.send(userName + " did not specify a target. " + userName + " is now a snail for the next seven and a half minutes.");
					} else {
						channel.send(userName + " turns back time to reverse his act of aggression against " + text.substring(8, text.length + 1) + ".");
					}
					break;

				case 'roulette': // picks a random user
					var randUser = "@" + randomUser(channel).name;
					channel.send("The bottle points to <" + randUser + ">.");
					break;

				case 'status':
					generateStatus(channel);
					break;

				case 'xkcd':
					if (textArgs.length < 2) {
						request("http://xkcd.com/info.0.json", function (error, response, body) {
							var results = JSON.parse(body);
							if (results.num != null && results.num != undefined) {
								request("http://xkcd.com/" + randomRange(1, results.num + 1) + "/info.0.json", function (error, response, body) {
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
						request("http://xkcd.com/" + textArgs[1] + "/info.0.json", function (error, response, body) {
							var results = JSON.parse(body);
							if (results.img != undefined && results.img != null) {
								channel.send(results.img);
							} else {
								channel.send("Error: comic does not exist with this number.");
							}
						});
					}
					break;

				case 'yt': // posts the first youtube result with given query
					if (enabledAPIs.google) {
						request('https://www.googleapis.com/youtube/v3/search?part=snippet&q=' + text.substring(3, text.length).replace(' ', '+') + '&key=' + API_KEY, function (error, response, body) {
							var results = JSON.parse(body).items;
							var chosenResult = 0;
							while (results[chosenResult].id.kind != 'youtube#video') {
								chosenResult++;
							}
							channel.send('https://www.youtube.com/watch?v=' + results[chosenResult].id.videoId);
						});
					} else {
						channel.send("Error: google API not enabled");
					}
					break;
			}
		} else {
			typeError = type !== 'message' ? "unexpected type " + type + "." : null;
			textError = text == null ? 'text was undefined.' : null;
			channelError = channel == null ? 'channel was undefined.' : null;
			errors = [typeError, textError, channelError].filter(function (element) {
				return element !== null;
			}).join(' ');
			return console.log("@" + slack.self.name + " could not respond. " + errors);
		}
	});

	slack.on('error', function (error) {
		return console.error("Error: " + error);
	});

	slack.login();

}).call(this);
