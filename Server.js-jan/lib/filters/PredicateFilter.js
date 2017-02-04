var Filter = require('bloem').Bloem,
    _ = require('lodash'),
    N3Util = require('n3').Util,
    Promise = require('promise');

var cache=true;

function PredicateFilter(datasource, query, variable, totalCount, callback) {
  /*if(predicates.length == 0) {
    return callback(null, null);
  }*/

  if(variable != "object" && variable != "subject" && variable != "object subject") {
    return callback(null, null);
  } else {
    if(cache) {
      if(typeof filterCache === "undefined") {
        filterCache = new Array();
      }
      var filterStr = query.patternString + "|" + query.offset;

      if(typeof filterCache[filterStr] !== "undefined") {
          if(filterCache[filterStr] == "null") {
            return callback(null, null);
          } else {
            return callback(null, {
              data: filterCache[filterStr]
            });
          }
      }
    }

    var result = datasource.select(query, null);

    var arr = new Array();

    result.on('data', function (triple) {
      if(variable == "object subject") {
        arr.push(triple["subject"]);  // Jan 2 - if object AND subject are variables, we only include triples, linked with the subject
        //arr.push(triple["object"]);
      } else {
        arr.push(triple[variable]);
      }
    });

    result.on('end', (function () {
      var promArr = arr.map(function(tvar) {
          return [new Promise(function(resolve, reject) {
            var q = new Object();
            q.subject = tvar;
            q.predicate = "?p";
            q.object = "?o";

            var rs =  datasource.select(q, null);
            var tmp = new Array();

            rs.on("data", function(triple) {
              //if(_.contains(predicates, triple["predicate"])) {
                tmp.push(triple["subject"] + "|" + triple["predicate"] + "|" + triple["object"]);
              //}
            });

            rs.on("end", function(triple) {
              resolve(tmp);
            });
          }),
          new Promise(function(resolve, reject) {
            var q = new Object();
            q.subject = "?s";
            q.predicate = "?p";
            q.object = tvar;

            var rs =  datasource.select(q, null);
            var tmp = new Array();

            rs.on("data", function(triple) {
              //if(_.contains(predicates, triple["predicate"])) {
                tmp.push(triple["subject"] + "|" + triple["predicate"] + "|" + triple["object"]);
              //}
            });

            rs.on("end", function(triple) {
              resolve(tmp);
            });
          })
        ];
      });

      var promArr = [].concat.apply([], promArr);

      Promise.all(promArr).then(function(value) {
          var array = [].concat.apply([], value);
          var arrlen=array.length;

          if(arrlen > 20000) {
            if(cache) {
              filterCache[filterStr]="null";
            }
            return callback(null, null);
          }

          var error_p = 0.001;
          var k = 0;
          var m = Math.ceil((-arrlen * Math.log(error_p)) / (Math.LN2 * Math.LN2));

          if(m != 0) {
            k = Math.round((m / arrlen) * Math.LN2);
          }

          var bloom = new Filter(m, k);

          for(var item of array) {
            bloom.add(Buffer(item));
          }

          var data = m + "," + k + "," + bloom.bitfield.buffer.toString('base64');

          if(cache) {
            filterCache[filterStr]=data;
          }

          return callback(null, {
            data: data
          });
        }, function(napaka) {
          console.log(napaka);
        }
      );
    }));
  }
}

module.exports = PredicateFilter;
