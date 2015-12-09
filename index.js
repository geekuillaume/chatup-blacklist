module.exports = function chatupBlacklist(options) {
  if (!options) {options = {}}
  var redisSetName = options.redisSetName || 'chatup:blacklist:words';
  var redisMutedSetName = options.redisMutedSetName || 'chatup:blacklist:muted';
  var redisUpdateInterval = options.redisUpdateInterval || 2000;
  var mutedWordsReplacement = options.mutedWordsReplacement || '***';
  var blacklistedWords = [];
  var mutedWords = [];
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
        mutedWords = results[1] || [];
        resolve();
      })
    });
  }

  return function chatupBlacklistMiddleware(ctx, next) {
    redisConnection = ctx.redisConnection;
    if (updaterTimer === null) {
      updaterTimer = setInterval(updateWords, redisUpdateInterval);
      updateWords();
    }
    var checkWords = function() {
      for (var i = 0; i < blacklistedWords.length; i++) {
        if (ctx.msg.msg.indexOf(blacklistedWords[i]) !== -1) {
          return next({status: 'error', err: 'blacklistedWord'});
        }
      }
      for (var i = 0; i < mutedWords.length; i++) {
        if (ctx.msg.msg.indexOf(mutedWords[i]) !== -1) {
          ctx.msg.msg = ctx.msg.msg.replace(mutedWords[i], mutedWordsReplacement);
        }
      }
      return next();
    }
    if (lastUpdated === -1) {updateWordsPromise.then(checkWords)}
    else {checkWords()}
  }
}
