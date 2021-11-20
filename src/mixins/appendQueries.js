export default {
    methods: {
        appendQueries: function(target, queries){
            const numKeys = Object.keys(queries).length
            let query = ""
            for(let i = 0; i < numKeys; i++){
              let prefix = i==0? "?" : "&"
              let key = Object.keys(queries)[i]
              let value = queries[key]
              query += prefix + key + "=" + value
            }
            return target + query
          }
    }
}