<template>
  <div>
    Enter wallet address:
    <input v-model="addr" type="text" />
    <button v-on:click="search">go</button>
  </div>
</template>

<script>
export default {
  name: "AddressInput",
  data: () => ({
    addr: "",
  }),
  methods: {
    search: function () {
      this.$emit("clicked", this.addr);
      window.history.replaceState(null, null, "?addr=" + this.addr);
    },
  },
};
</script>