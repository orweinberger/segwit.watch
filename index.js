const Client = require('bitcoin-core');
const level = require('level')
const client = new Client({ network: 'testnet'});
const { getBlockHash, getBlock, getBlockCount } = require('./lib/blocks');
const { getTransaction } = require('./lib/transactions');

//leveldb
const db = level('data');
let syncing = false;

//Express
let express = require('express');
let app = express();
app.use(express.static('public'))
app.set('view engine', 'ejs');
app.get('/', async (req, res) => {
  let data = await db.get('data');
  res.render('index', { data });
});


async function sync() {
  syncing = true;
  console.log(`Started sync ${new Date().toISOString()}`);
  let count = await getBlockCount(client);
  let prev, prev_json;
  console.log('got count', count);
  let last = count - 3;
  try {
    last = parseInt(await db.get('last'));
  }
  catch (x) {
    console.log('First run');
  }
  let results = [];
  if (last < count) {
    console.log('updating last to', count);
    await db.put('last', count);
    for (i = last + 1; i <= count; i++) {
      let blockHash = await getBlockHash(client, i);
      let block = await analyzeBlock(blockHash);
      results.push(block);
    }
    try {
      prev = await db.get('data');
      prev_json = JSON.parse(prev);
    }
    catch (x) {
      prev_json = [];
    }
    await db.put('data', JSON.stringify([...prev_json, ...results]));
  }
  syncing = false;
  console.log(`Finished sync ${new Date().toISOString()}`);
}

async function analyzeBlock(hash) {
  console.log(`Working on ${hash}`)
  let block = await getBlock(client, hash);
  let txs = block.tx;
  let total_txs = txs.length;
  let segwit_txs = 0;
  for (txid of txs) {
    let segwit = true;
    let tx = await getTransaction(client, txid);
    tx.vout.forEach((vout) => {
      if (vout.scriptPubKey.type != 'witness_v0_keyhash' && vout.scriptPubKey.type != 'witness_v0_scripthash') {
        segwit = false;
      }
    });

    if (segwit === true) {
      for (vin of tx.vin) {
        input = await getTransaction(client, vin.txid);
        input.vout.forEach((vout) => {
          if (vout.n === vin.vout) {
            if (vout.scriptPubKey.type != 'witness_v0_keyhash' && vout.scriptPubKey.type != 'witness_v0_scripthash') {
              segwit = false;
            }
          }
        })
      }
    }
    if (segwit === true) {
      segwit_txs++;
    }
  }
  return { time: new Date(block.time * 1000).toISOString(), height: block.height, hash, total_txs, segwit_txs, segwit_txs_pct: Math.floor(segwit_txs/total_txs*100), total_txs_pct: 100 }
}
setInterval(function() {
  if (!syncing)
    sync();
}, 30000);
sync();
app.listen(3000, () => console.log('Example app listening on port 3000!'));