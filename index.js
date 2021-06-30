const HTTP_PORT = process.env.HTTP_PORT || 3000;
const BITCOIN_USERNAME = process.env.BITCOIN_USERNAME || 'test';
const BITCOIN_PASSWORD = process.env.BITCOIN_PASSWORD || 'test';
const BITCOIN_PORT = process.env.BITCOIN_PORT || 8332;
const BITCOIN_HOST = process.env.BITCOIN_HOST || 'localhost';
const SYNC_BLOCKS = process.env.SYNC_BLOCKS || 2016;

const Client = require('bitcoin-core');
const level = require('level')
const { getBlockHash, getBlock, getBlockCount } = require('./lib/blocks');
const { getTransaction } = require('./lib/transactions');
const express = require('express');
const fs = require('fs');

const offenders = JSON.parse(fs.readFileSync('./offenders.json', 'utf-8'))

//leveldb
const db = level('data');
let syncing = false;

//Express
let app = express();
app.use(express.static('public'))
app.set('view engine', 'ejs');
app.get('/', async (req, res) => {
  try {
    let data = await db.get('data');
    res.render('index', { data, offenders });
  }
  catch (x) {
    res.render('index', { data: [], offenders });
  }
});

const client = new Client({
  username: BITCOIN_USERNAME,
  password: BITCOIN_PASSWORD,
  port: BITCOIN_PORT,
  host: BITCOIN_HOST
});

const log = function(message) {
  console.log(`${new Date().toISOString()} ${message}`)
}

async function sync() {
  syncing = true;
  log('Started sync');
  let count = await getBlockCount(client);
  let prev, prev_json;
  let last = count - SYNC_BLOCKS;
  try {
    last = parseInt(await db.get('last'));
  }
  catch (x) {
    log('First run');
  }
  let results = [];
  if (last < count) {
    log('updating last to', count);
    await db.put('last', count);
    for (i = last + 1; i <= count; i++) {
      let blockHash = await getBlockHash(client, i);
      let block = await analyzeBlock(blockHash);
      //Ignore empty blocks
      if (block.total_txs > 1)
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
  log('Finished sync');
}

async function analyzeBlock(hash) {
  log(`Working on ${hash}`)
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
  return {
    time: new Date(block.time * 1000).toISOString(),
    segwit_txs_pct: Math.floor(segwit_txs / total_txs * 100),
    total_txs,
    total_txs_pct: 100
  }
}
setInterval(function() {
  if (!syncing)
    sync();
}, 60000);

sync();

app.listen(HTTP_PORT, () => log('Started HTTP server'));