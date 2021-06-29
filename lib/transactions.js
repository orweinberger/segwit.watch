const transactions = {
  getTransaction: function (client, txid) {
    return new Promise((resolve, reject) => {
      client.getRawTransaction(txid, true)
        .then((tx) => {
          return resolve(tx);
        })
    })
  }
}

module.exports = transactions;