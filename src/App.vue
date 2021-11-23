<template>
  <div id="app">
    <h1>fx(sales)</h1>
    <div>
      A tool to show secondary and primary sales on
      <a href="https://www.fxhash.xyz/" target="_blank">fxhash</a>.
    </div>
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
import appendQueries from "./mixins/appendQueries";
import SalesTable from "./components/SalesTable.vue";

export default {
  name: "App",
  mixins: [appendQueries],
  components: { SalesTable },
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
  computed: {
    loading: function () {
      let check = this.salesMode == "secondary" ? this.secondarySales : this.primarySales;
      if (check.filter((s) => s.tokenName === "loading...").length > 0) {
        return "Data is still loading. Please wait.";
      } else {
        return "Data has finished loading. Download ready.";
      }
    },
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
      let check = this.salesMode == "secondary" ? this.secondarySales : this.primarySales;
      check.forEach((sale) => {
        let row = [];
        row.push(sale.tokenName);
        row.push(sale.amount);
        let alias = sale.buyerAlias;
        if (alias) {
          alias = alias.replace(",", "");
        } else {
          alias = "No Alias";
        }
        row.push(alias);
        row.push(sale.buyerAddress);
        let date = new Date(sale.timestamp);
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        let day = date.getDate();
        let hour = date.getHours();
        let minute = date.getMinutes();
        let seconds = date.getSeconds();
        let time = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        date = `${year}/${month.toString().padStart(2, "0")}/${day
          .toString()
          .padStart(2, "0")}`;
        row.push(date);
        row.push(time);
        row.push(sale.timestamp);
        row.push("https://tzkt.io/" + sale.operationHash);
        rows.push(row);
      });
      let csv = rows.map((e) => e.join(",")).join("\n");
      var download = function (content, fileName, mimeType) {
        var a = document.createElement("a");
        mimeType = mimeType || "application/octet-stream";

        if (navigator.msSaveBlob) {
          // IE10
          navigator.msSaveBlob(
            new Blob([content], {
              type: mimeType,
            }),
            fileName
          );
        } else if (URL && "download" in a) {
          //html5 A[download]
          a.href = URL.createObjectURL(
            new Blob([content], {
              type: mimeType,
            })
          );
          a.setAttribute("download", fileName);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          location.href =
            "data:application/octet-stream," + encodeURIComponent(content); // only this mime type is supported
        }
      };
      download(csv, "test.csv", "text/csv;encoding:utf-8");
    },
    search: function () {
      window.history.replaceState(null, null, "?addr=" + this.addr);
      if (this.salesMode == "secondary" && this.secondarySales.length == 0)
        this.getSecondarySalesTx();
      if (this.salesMode == "primary" && this.primarySales.length == 0)
        this.getPrimarySales();
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
      sale.CID = ""
      this.assignName(sale);
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
        sales.CID = ""
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
      this.assignName(sale);
    },
    assignName: async function (sale) {
      let endpoint = this.bcd + "tokens/mainnet/metadata";
      let query = this.appendQueries(endpoint, {
        contract: this.tokenContract,
        token_id: sale.objktID,
      });
      let res = await fetch(query);
      let dat = await res.json();
      sale.CID = dat[0].token_info["@@empty"].substring("7")
      if(dat[0].name == "Unknown"){
        this.getIPFSName(sale)
      } else {
        sale.tokenName = dat[0].name
      }
    },
    getIPFSName: async function(sale){
      let query = "https://ipfs.io/ipfs/" + sale.CID
      let res = await fetch(query)
      let dat = await res.json()
      sale.tokenName = dat.name
    }
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
