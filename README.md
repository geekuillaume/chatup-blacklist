# ChatUp Blacklist Plugin

A ChatUp plugin to block messages containing specific strings. The blacklisted strings are stored on Redis and can be changed on the fly. The plugin can also 'mute' some strings that are replaced by another string, like '***'.

## Example


Start by installing `chatup-blacklist` npm module with `npm install --save chatup-blacklist`.

### Dispatcher

You can add the plugin on the dispatcher side. This will add the `POST /plugin/blacklist` route to modify the list of blackilsted and muted words. Do this on your dispatcher config file:

```js
var dispatcher = new ChatUp.Dispatcher({
  jwt: {
    key: process.env.CHATUP_JWTKEY || require('fs').readFileSync(__dirname + '/../JWTKeyExample.pub').toString(),
  }
});

dispatcher.registerPlugin(require('chatup-blacklist')().dispatcher);

dispatcher.listen(80);
```

You can send a POST request to `/plugin/blacklist` containing a signed JWT (with the public key provided in the config). Here's an example of content and the associated JWT:

```json
{
  "blacklistAdd": ["blacklistedWord"],
  "blacklistRemove": ["unblacklistedWord"],
  "muteAdd": ["mutedWord"],
  "muteRemove": ["unmutedWord"]
}
```

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJibGFja2xpc3RBZGQiOlsiYmxhY2tsaXN0ZWRXb3JkIl0sImJsYWNrbGlzdFJlbW92ZSI6WyJ1bmJsYWNrbGlzdGVkV29yZCJdLCJtdXRlQWRkIjpbIm11dGVkV29yZCJdLCJtdXRlUmVtb3ZlIjpbInVubXV0ZWRXb3JkIl19.aC4VoVQHVnlESYQjYbqLOz55eYcPf7X7KYUuk5jGXXVf5Q8Hs1IYlkpqPAXAtoCw7r2P4asUiXwhGe7hmAv87KwQVDbmIPwwsAZ5xsBu_NOBPRW8lXplCQF56O3nkJZIO2rt7rYkB5pdYoiKza_BTraMjzhsIMBuay73-2Cato1QSiJsiAU-7u_X25s90k0YN0sWcuSxe02uobH8-i9MEo0P_sYkwPHJLJYQXaZHqFLTN8Y-YRWoFW4elPyL9_gu0I_d0fTZnXCWkJGcBtj5sntxJzyo_THCYND0n11cgoDXr8ozIQ95WZwYlTu95eLtt-u6Mldl1AOZq5uovYEXrw
```

### Worker

In your worker config file, do something like this:

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
