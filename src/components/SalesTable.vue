<template>
  <div>
    <table>
      <tr>
        <td></td>
        <td>Token Name</td>
        <td v-if="type == 'primary'">Amount Received</td>
        <td v-if="type == 'secondary'">Sold for</td>
        <td v-if="type == 'secondary'">Royalties<br />Received</td>
        <td>Buyer</td>
        <td v-if="type == 'secondary'">Seller</td>
        <td>Timestamp</td>
      </tr>
      <tr v-for="(sale, i) in data[0][Object.keys(data[0])[0]]" :key="i">
        <td>{{ i + 1 }}</td>
        <td>
          <a
            :href="'https://www.fxhash.xyz/objkt/' + sale.objktID"
            target="_blank"
          >
            {{ sale.tokenName }}</a
          >
        </td>
        <td v-if="type == 'primary'">{{ sale.amount }}</td>
        <td v-if="type == 'secondary'">{{ sale.soldPrice }}</td>
        <td v-if="type == 'secondary'">{{ sale.amount }}</td>
        <td>
          <a :href="'https://tzkt.io/' + sale.buyerAddress" target="_blank">{{
            sale.buyerAlias || shortenAddress(sale.buyerAddress)
          }}</a>
        </td>
        <td v-if="type == 'secondary'">
          <a :href="'https://tzkt.io/' + sale.sellerAddress" target="_blank">
            {{ sale.sellerAlias || shortenAddress(sale.sellerAddress) }}
          </a>
        </td>
        <td>
          <a :href="'https://tzkt.io/' + sale.operationHash" target="_blank">
            {{ sale.timestamp }}
          </a>
        </td>
      </tr>
    </table>
  </div>
</template>

<script>
export default {
  name: "SalesTable",
  props: {
    type: String,
    data: null,
  },
  methods: {
    shortenAddress: function (addr) {
      let first = addr.substring(0, 4);
      let last = addr.substring(31);
      return first + "..." + last;
    },
  },
};
</script>

<style>
</style>