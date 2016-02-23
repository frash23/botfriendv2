# README #

This is a chat bot for the Slack chat software, focused on providing an entertaining supplement to a group of friends with various API integrations and humorous commands.

### Dependencies ###

* slack-client
* request
* googleapis
* shelljs
* imgur
* tumblr.js
* cleverbot

### Usage ###

Use `npm install slack-client request googleapis shelljs imgur tumblr.js cleverbot` in the project directory to install dependencies, then `./run.sh` to start the bot. If the `login.json` file is not present, all API integrations will be nonfunctional and the bot may crash.

EVEN IF YOU DO NOT UTILIZE THE API INTEGRATION DEPENDENCIES, YOU MUST STILL HAVE THE MODULES INSTALLED.

The bot will automatically shut down after 30 minutes of operation, so make sure to run it in a loop.

### config.json ###

Config file containing various defaults.
API values define whether the API integrations are active. Disable if valid API keys are not present in `login.json`.

### login.json ###

Contains various API keys for the integrations. Not included in the repository for obvious reasons, must be created manually. See `example_login.json` for a template.

### run.sh ###

Runs the code in a loop. Use this for `botrestart` to work!

### botfriend.js ###

Contains all code including command listener, bot functions and scheduled events.

### statustext.json ###

Necessary for the `status` command. Contains the sentences used to generate status messages.