const blocks = {
  getBestBlockHash: function (client) {
    return new Promise((resolve, reject) => {
      client.getBestBlockHash()
        .then((hash) => {
          return resolve(hash);
        })
    })
  },

  getBlock: function (client, hash) {
    return new Promise((resolve, reject) => {
      client.getBlock(hash, true)
        .then((block) => {
          return resolve(block);
        })
    });
  },

  getBlockCount: function(client) {
    return new Promise((resolve, reject) => {
      client.getBlockCount()
        .then((count) => {
          return resolve(count);
        })
    })
  },
  getBlockHash: function(client, height) {
    return new Promise((resolve, reject) => {
      client.getBlockHash(height)
        .then((hash) => {
          return resolve(hash);
        })
    })
  }
}

return module.exports = blocks;