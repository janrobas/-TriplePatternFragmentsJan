var Datasource = require('./Datasource'),
    fs = require('fs'),
    mysql = require('mysql');

function MariaDbDatasource(options) {
  if (!(this instanceof MariaDbDatasource))
    return new MariaDbDatasource(options);
  Datasource.call(this, options);

  this.options = options || {};

  this.pool = mysql.createPool({
    host: this.options.host,
    user: this.options.user,
    password: this.options.password,
    connectionLimit: 100
  });
}

Datasource.extend(MariaDbDatasource, ['triplePattern', 'limit', 'offset', 'totalCount']);

MariaDbDatasource.prototype._executeQuery = function (query, tripleStream, metadataCallback) {
    var pool = this.pool;

    var pogoji = new Array();

    // če je subjekt, predikat ali objekt definiran kot ?..., potem gre za spremenljivko, tako da te ne damo med pogoje
    if(query.subject && query.subject[0] != '?') {
      pogoji.push("s="+ mysql.escape(query.subject));
    }
    if(query.predicate && query.predicate[0] != '?') {
      pogoji.push("p=" + mysql.escape(query.predicate));
    }
    if(query.object && query.object[0] != '?') {
      pogoji.push("o=" + mysql.escape(query.object));
    }

    var pogojiSql = "";

    if(pogoji.length > 0) {
        pogojiSql+= " WHERE " + pogoji.join(" AND ");
    }

    // naša poizvedba
    var dbQuery = 'SELECT * FROM ' + (this.options.db) + '.' + (this.options.tabela) + pogojiSql;

    if(query.offset || query.limit) {
      dbQuery += ' LIMIT ' + (String(query.offset || 0)) + "," + (String(query.limit || 0));
    }

    // število vseh najdenih predikatov (brez omejitve)
    var dbCountQuery = 'SELECT COUNT(*) AS cnt FROM ' + (this.options.db) + '.' + (this.options.tabela) + pogojiSql;

    //pool.getConnection(function(err, connection) {
      pool.query(dbQuery, function(err, rows) {
        if (err) {
          throw err;
          c.end();
        }

        for(var row of rows) {
          tripleStream.push({ subject: row.s, predicate: row.p, object: row.o });
        }

        // ko dodamo vse predikate (upoštevajoč omejitve), izvedemo še poizvedbo, ki prešteje število vseh in to število vrnemo kot metapodatek
        pool.query(dbCountQuery, function(err, rows2) {
          metadataCallback({ totalCount: rows2[0]["cnt"] });
          tripleStream.push(null);
          //connection.release();
        });
      });
    //});
};

module.exports = MariaDbDatasource;
