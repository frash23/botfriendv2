# README #

This is a chat bot for the Slack chat solution. Maintained by techniponi

### Dependencies ###

* slack-client
* request
* googleapis
* shelljs
* imgur
* tumblr.js

### Usage ###

Use `npm install slack-client request googleapis shelljs imgur tumblr.js` in the project directory to install dependencies, then `./run.sh` to start the bot. If the `login.json` file is not present, all API integrations will be nonfunctional and the bot may crash.

### run.sh ###

Runs the code in a loop. Use this for 'botrestart' to work!

### botfriend.js ###

Contains all code including command listener, bot functions and scheduled events.
