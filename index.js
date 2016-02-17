var jwt = require('jsonwebtoken');
var _ = require('lodash');
var bodyParser = require('body-parser');

console.log('coucou')

module.exports = function chatupBlacklist(options) {
  if (!options) {options = {}}
  var redisSetName = options.redisSetName || 'chatup:blacklist:words';
  var redisMutedSetName = options.redisMutedSetName || 'chatup:blacklist:muted';
  var redisUpdateInterval = options.redisUpdateInterval || 2000;
  var mutedWordsReplacement = options.mutedWordsReplacement || ' *** ';
  var blacklistedWords = [];
  var blacklistedRegex;
  var mutedWords = [];
  var mutedRegex;
  var redisConnection = null;
  var updaterTimer = null;
  var updateWordsPromise = null;
  var lastUpdated = -1;

  function updateWords() {
    updateWordsPromise = new Promise((resolve, reject) => {
      redisConnection.multi()
      .smembers(redisSetName)
      .smembers(redisMutedSetName)
      .exec(function(err, results) {
        lastUpdated = Date.now();
        blacklistedWords = results[0] || [];
        blacklistedRegex = new RegExp(`(?:^|\\s)(${blacklistedWords.join('|').replace('.', '\\.')})(?:$|\\s)`, 'g')
        mutedWords = results[1] || [];
        mutedRegex = new RegExp(`(?:^|\\s)(${mutedWords.join('|').replace('.', '\\.')})(?:$|\\s)`, 'g')
        resolve();
      })
    });
  }

  var chatupBlacklistMiddleware = function(ctx, next) {
    redisConnection = ctx.redisConnection;
    if (updaterTimer === null) {
      updaterTimer = setInterval(updateWords, redisUpdateInterval);
      updateWords();
    }
    var checkWords = function() {
      if (blacklistedWords.length && ctx.msg.msg.match(blacklistedRegex) !== null) {
        return next({status: 'error', err: 'blacklistedWord'});
      }
      if(mutedWords.length) {
        ctx.msg.msg = ctx.msg.msg.replace(mutedRegex, mutedWordsReplacement)
      }
      return next();
    }
    if (lastUpdated === -1) {updateWordsPromise.then(checkWords)}
    else {checkWords()}
  }

  var dispatcherPlugin = function(parent) {
    parent._app.post('/plugin/blacklist', bodyParser.text(), function (req, res) {
      if (!_.isString(req.body)) {
        return res.status(400).send({ status: 'error', err: 'No body' });
      }
      jwt.verify(req.body,
        parent._conf.jwt.key,
        parent._conf.jwt.options,
        function (err, decoded) {
          if (err) {
            return res.status(401).send({ status: 'error', err: 'Wrong JWT' });
          }
          if (!_.isObject(decoded)) {
            return res.status(400).send({ status: 'error', err: 'Wrong JWT content'});
          }
          var redisMulti = parent._redisConnection.multi();
          if (decoded.blacklistAdd) {
            redisMulti.sadd(redisSetName, decoded.blacklistAdd);
          }
          if (decoded.blacklistRemove) {
            redisMulti.srem(redisSetName, decoded.blacklistRemove);
          }
          if (decoded.muteAdd) {
            redisMulti.sadd(redisMutedSetName, decoded.muteAdd);
          }
          if (decoded.muteRemove) {
            redisMulti.srem(redisMutedSetName, decoded.muteRemove);
          }
          redisMulti.exec(function (err) {
            if (err) {
              logger.captureError(err);
              return res.status(500).send(err);
            }
            res.sendStatus(200);
          });
        }
      );
    });
  }

  chatupBlacklistMiddleware.dispatcher = dispatcherPlugin;
  return chatupBlacklistMiddleware;
}
