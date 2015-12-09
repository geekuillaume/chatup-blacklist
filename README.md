# ChatUp Blacklist Plugin

A ChatUp plugin to block messages containing specific strings. The blacklisted strings are stored on Redis and can be changed on the fly. The plugin can also 'mute' some strings that are replaced by another string, like '***'.

## Example

Start by installing `chatup-blacklist` npm module with `npm install --save chatup-blacklist`, then in your ChatUp worker file, do something like this:

```js
var conf = {}; // Your configuration
var worker = new ChatUp.ChatWorker(conf);

worker.registerMiddleware(require('chatup-blacklist')({ // these are the default values, you can omit them
  redisSetName: 'chatup:blacklist:words', // the name of the Redis Set
  redisUpdateInterval: 2000, // in ms, how long to wait between two updates from redis
  redisMutedSetName: 'chatup:blacklist:muted', // words that will be replaced by mutedWordsReplacement
  mutedWordsReplacement: '***' // replacement for muted words
}));

worker.listen();
```
