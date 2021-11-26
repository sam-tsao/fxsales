export default {
  methods: {
    download: function (content, fileName, mimeType) {
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
    },
    addEntry: function(sale){
      let row = []
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
        return row
    }
  },
};
