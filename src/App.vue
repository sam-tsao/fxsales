<template>
  <div id="app">
    <h1>fx(sales)</h1>
    <div>A tool to show secondary and primary sales on <a
    href="https://www.fxhash.xyz/" target="_blank">fxhash</a>.</div>
    <div>
      Enter wallet address:
      <input v-model="addr" type="text" />
      <button v-on:click="search">go</button>
    </div>
    <div>
      <input
        type="radio"
        id="secondary"
        v-model="salesMode"
        value="secondary"
      />
      <label for="secondary">Secondary Sales</label>
      <input type="radio" id="mints" v-model="salesMode" value="primary" />
      <label for="mints">Mints(Primary Sales)</label>
    </div>

    <!-- SECONDARY SALES -->

    <table v-if="secondarySales.length > 0 && salesMode == 'secondary'">
      <tr>
        <td></td>
        <td><h3>Token Name</h3></td>
        <td><h3>Sold for</h3></td>
        <td>
          <h3>Royalties<br />Received</h3>
        </td>
        <td><h3>Buyer</h3></td>
        <td><h3>Seller</h3></td>
        <td><h3>Timestamp</h3></td>
      </tr>
      <tr v-for="(sales, i) in secondarySales" :key="i">
        <td>{{ i + 1 }}</td>
        <td>
          <a
            :href="'https://www.fxhash.xyz/objkt/' + sales.objktID"
            target="_blank"
            >{{ sales.tokenName }}</a
          >
        </td>
        <td>{{ sales.soldPrice }}</td>
        <td>{{ sales.amount }}</td>
        <td>
          <a :href="'https://tzkt.io/' + sales.buyerAddress" target="_blank">{{
            sales.buyerAlias || shortenAddress(sales.buyerAddress)
          }}</a>
        </td>
        <td>
          <a :href="'https://tzkt.io/' + sales.sellerAddress" target="_blank">{{
            sales.sellerAlias || shortenAddress(sales.sellerAddress)
          }}</a>
        </td>
        <td>
          <a :href="'https://tzkt.io/' + sales.operationHash" target="_blank">{{
            sales.timestamp
          }}</a>
        </td>
      </tr>
      <tr v-if="secondarySales.length > 1">
        <td></td>
        <td>Total:</td>
        <td>
          {{
            secondarySales
              .reduce((prev, next) => ({
                soldPrice: prev.soldPrice + next.soldPrice,
              }))
              .soldPrice.toFixed(5)
          }}
        </td>
        <td>
          {{
            secondarySales.reduce((prev, next) => ({
              amount: prev.amount + next.amount,
            })).amount
          }}
        </td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    </table>
    <table v-if="salesMode == 'primary'">
      <tr>
        <td></td>
        <td><h3>amount received</h3></td>
        <td><h3>Buyer</h3></td>
        <td><h3>Token Name</h3></td>
        <td><h3>Timestamp</h3></td>
      </tr>
      <tr v-for="(sales, i) in primarySales" :key="i">
        <td>{{ i + 1 }}</td>
        <td>{{ sales.amount }}</td>
        <td>
          <a :href="'https://tzkt.io/' + sales.buyerAddress" target="_blank">{{
            sales.buyerAlias || shortenAddress(sales.buyerAddress)
          }}</a>
        </td>
        <td>
          <a
            :href="'https://www.fxhash.xyz/objkt/' + sales.objktID"
            target="_blank"
            >{{ sales.tokenName }}</a
          >
        </td>
        <td>
          <a :href="'https://tzkt.io/' + sales.operationHash" target="_blank">{{
            sales.timestamp
          }}</a>
        </td>
      </tr>
    </table>
    <footer>
      Made by
      <a href="https://twitter.com/sam___tsao" target="_blank">Sam Tsao</a>
    </footer>
  </div>
</template>

<script>
import appendQueries from "./mixins/appendQueries";

export default {
  name: "App",
  mixins: [appendQueries],
  components: {},
  data: () => ({
    salesMode: "secondary",
    addr: "",
    tzkt: "https://api.tzkt.io/v1/",
    fxhashMarket: "KT1Xo5B7PNBAeynZPmca4bRh6LQow4og1Zb9",
    issuer: "KT1AEVuykWeuuFX7QkEAMNtffzwhe1Z98hJS",
    secondarySales: [],
    primarySales: [],
    tokenContract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
    bcd: "https://api.better-call.dev/v1/",
  }),
  watch: {
    salesMode: function () {
      this.search();
    },
  },
  created() {
    this.checkURLQuery();
  },
  methods: {
    checkURLQuery: function () {
      let urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("addr")) {
        this.addr = urlParams.get("addr");
        if (this.salesMode == "secondary") this.getSecondarySalesTx();
        if (this.salesMode == "primary") this.getPrimarySales();
      }
    },
    search: function () {
      window.history.replaceState(null, null, "?addr=" + this.addr);
      if (this.salesMode == "secondary" && this.secondarySales.length == 0)
        this.getSecondarySalesTx();
      if (this.salesMode == "primary" && this.primarySales.length == 0)
        this.getPrimarySales();
    },
    shortenAddress: function (addr) {
      let first = addr.substring(0, 4);
      let last = addr.substring(31);
      return first + "..." + last;
    },
    getPrimarySales: async function () {
      this.primarySales = [];
      let endpoint = this.tzkt + "operations/transactions";
      let finished = false;
      let counter = 0;
      while (!finished) {
        let query = this.appendQueries(endpoint, {
          sender: this.issuer,
          target: this.addr,
          status: "applied",
          limit: 100,
          offset: counter * 100,
        });
        let res = await fetch(query);
        let dat = await res.json();
        if (dat.length > 0 && !finished) {
          for (let i = 0; i < dat.length; i++) {
            let sales = {};
            sales.amount = dat[i].amount / Math.pow(10, 6);
            sales.operationHash = dat[i].hash;
            sales.timestamp = dat[i].timestamp;
            sales.issuerID = "";
            sales.objktID = "";
            sales.CID = "";
            sales.buyerAddress = "";
            sales.buyerAlias = "";
            sales.tokenName = "loading...";
            this.getTransactionData(sales);
            this.primarySales.push(sales);
          }
        } else {
          finished = true;
        }
        counter++;
        if (counter > 100) {
          finished = true;
        }
      }
    },
    getTransactionData: async function (sale) {
      let endpoint =
        this.tzkt + "operations/transactions/" + sale.operationHash;
      let res = await fetch(endpoint);
      let dat = await res.json();
      sale.issuerID = dat[0].parameter.value.issuer_id;
      sale.buyerAddress = dat[0].sender.address;
      sale.buyerAlias = dat[0].sender.alias;
      sale.objktID = dat[dat.length - 1].parameter.value.token_id;
      this.assignCID(sale);
    },
    getSecondarySalesTx: async function () {
      this.secondarySales = [];
      let endpoint = this.tzkt + "operations/transactions";
      let query = this.appendQueries(endpoint, {
        sender: this.fxhashMarket,
        target: this.addr,
        "sort.desc": "level", //most recent transaction first
        status: "applied",
        limit: 1000,
      });
      let res = await fetch(query);
      let dat = await res.json();
      for (let i = 0; i < dat.length; i++) {
        let sales = {};
        sales.amount = dat[i].amount / Math.pow(10, 6);
        sales.buyerAddress = dat[i].initiator.address;
        sales.buyerAlias = dat[i].initiator.alias;
        sales.operationHash = dat[i].hash;
        sales.timestamp = dat[i].timestamp;
        sales.tokenName = "loading...";
        sales.objktID = "";
        sales.soldPrice = "";
        sales.CID = "";
        sales.sellerAddress = "";
        sales.sellerAlias = "";
        this.assignObjktID(sales); //ASYNC
        this.secondarySales.push(sales);
      }
    },
    assignObjktID: async function (sale) {
      let endpoint =
        this.tzkt + "operations/transactions/" + sale.operationHash;
      let res = await fetch(endpoint);
      let dat = await res.json();
      let objktID = dat[0].diffs[0].content.value.objkt_id;
      //console.log(dat)
      sale.soldPrice = dat[0].amount / Math.pow(10, 6);
      sale.sellerAddress = dat[4].target.address;
      sale.sellerAlias = dat[4].target.alias;
      sale.objktID = objktID;
      this.assignCID(sale);
    },
    assignCID: async function (sale) {
      let endpoint = this.bcd + "tokens/mainnet/metadata";
      let query = this.appendQueries(endpoint, {
        contract: this.tokenContract,
        token_id: sale.objktID,
      });
      let res = await fetch(query);
      let dat = await res.json();
      sale.CID =
        dat[0].token_info[Object.keys(dat[0].token_info)[0]].substring(7);
      this.assignName(sale);
    },
    assignName: async function (sale) {
      const ipfslink = "https://gateway.ipfs.io/ipfs/" + sale.CID;
      const ipfsResponse = await fetch(ipfslink);
      const ipfsData = await ipfsResponse.json();
      sale.tokenName = ipfsData.name;
    },
  },
};
</script>

<style>
* {
  font-family: "Courier New", Courier, monospace;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
tr:nth-child(even) {
  background: #ccc;
}
h3 {
  margin: 0;
}
table {
  padding: 1em 1vw;
  margin-left: auto;
  margin-right: auto;
}
footer {
  text-align: center;
}
td {
  text-align: center;
  padding: 0.5em 0.5vw;
}
</style>
