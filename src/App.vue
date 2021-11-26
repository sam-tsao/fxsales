<template>
  <div id="app">
    <h1>fx(sales)</h1>
    <div>
      A tool to show secondary and primary sales on
      <a href="https://www.fxhash.xyz/" target="_blank">fxhash</a>.
    </div>
    <address-input @clicked="addressEntered"/>
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
    <div>
      <button v-on:click="exportCSV">csv export</button>
      {{ loading }}
    </div>
    <sales-table
      :type="salesMode"
      :data="[salesMode == 'secondary' ? { secondarySales } : { primarySales }]"
    ></sales-table>
    <footer>
      Made by
      <a href="https://twitter.com/sam___tsao" target="_blank">Sam Tsao</a>
    </footer>
  </div>
</template>

<script>
import AddressInput from "./components/AddressInput.vue"
import SalesTable from "./components/SalesTable.vue";
import appendQueries from "./mixins/appendQueries";
import csvUtils from "./mixins/csvUtils";

export default {
  name: "App",
  mixins: [appendQueries, csvUtils],
  components: { SalesTable, AddressInput },
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
    fxhash: "https://api.fxhash.xyz/graphql",
  }),
  watch: {
    salesMode: function () {
      this.search();
    },
  },
  created() {
    this.checkURLQuery();
  },
  computed: {
    loading: function () {
      let check =
        this.salesMode == "secondary" ? this.secondarySales : this.primarySales;
      if (check.filter((s) => s.tokenName === "loading...").length > 0) {
        return "Data is still loading. Please wait.";
      } else {
        return "Data has finished loading. Download ready.";
      }
    },
  },
  methods: {
    addressEntered: function(val){
      this.addr = val
      if (this.salesMode == "secondary" && this.secondarySales.length == 0)
        this.getSecondarySalesTx();
      if (this.salesMode == "primary" && this.primarySales.length == 0)
        this.getPrimarySales();
    },
    checkURLQuery: function () {
      let urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("addr")) {
        this.addr = urlParams.get("addr");
        if (this.salesMode == "secondary") this.getSecondarySalesTx();
        if (this.salesMode == "primary") this.getPrimarySales();
      }
    },
    exportCSV: function () {
      let rows = [];
      let amt = this.salesMode == "secondary" ? "Royalties" : "Amount";
      rows.push([
        "Token Name",
        amt,
        "Buyer Alias",
        "Buyer Address",
        "Date",
        "Time",
        "Isostring",
        "Transaction",
      ]);
      let check =
        this.salesMode == "secondary" ? this.secondarySales : this.primarySales;
      check.forEach((sale) => {
       let row = this.addEntry(sale)
        rows.push(row);
      });
      let csv = rows.map((e) => e.join(",")).join("\n");
      this.download(csv, `${this.salesMode}Sales.csv`, "text/csv;encoding:utf-8");
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
          //set limit for while loop
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
      sale.CID = "";
      this.getName(sale);
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
        sales.sellerAddress = "";
        sales.sellerAlias = "";
        sales.CID = "";
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
      sale.soldPrice = dat[0].amount / Math.pow(10, 6);
      sale.sellerAddress = dat[4].target.address;
      sale.sellerAlias = dat[4].target.alias;
      sale.objktID = objktID;
      this.getName(sale);
    },
    getName: async function (sale) {
      let q = `{objkt(id:${sale.objktID}){name}}`;
      let res = await this.postQuery(q);
      sale.tokenName = res.data.objkt.name;
    },
    postQuery: async function (query) {
      let res = await fetch(this.fxhash, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "post",
        body: JSON.stringify({
          query: query,
        }),
      });
      let dat = await res.json();
      return dat;
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
