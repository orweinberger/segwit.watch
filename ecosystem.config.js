module.exports = {
  apps : [{
    name   : "segwit.watch",
    script : "./index.js",
    env_production: {
      BITCOIN_USERNAME: "",
      BITCOIN_PASSWORD: "",
      BITCOIN_HOST: ""
    }
  }]
}