var qejs = require('qejs'),
    path = require('path'),
    _ = require('lodash'),
    N3Util = require('n3').Util
    Client = require('mariasql');

function SqlInsertWriter(options) {
  if (!(this instanceof SqlInsertWriter))
    return new SqlInsertWriter(options);
  var defaults = { cache: true, N3Util: N3Util, header: options && options.title };
  this._options = _.defaults(options || {}, defaults);
}


SqlInsertWriter.prototype.writeFragment = function (destination, tripleStream, settings) {
  var triples = [], self = this;
  tripleStream.on('data', function (triple) { triples.push(triple); });
  tripleStream.on('end',  function () { settings.triples = triples; settings.metadata && writeInserts(); });
  tripleStream.on('metadata', function (m) { settings.metadata = m; settings.triples  && writeInserts(); });

  function writeInserts() {
    if(triples.length > 0) {
      var inserti = "INSERT INTO testna_baza.trojcek (s, p, o) VALUES ";

      var vejica = "";

      for(var triple of triples) {
        inserti += vejica + "('" + Client.escape(triple.subject) + "', '" + Client.escape(triple.predicate) + "', '" + Client.escape(triple.object) + "')";
        vejica = ",";
      }

      inserti += ";";

      self._write(destination, inserti);
    } else {
      self._write(destination, "");
    }
  }
};

SqlInsertWriter.prototype._write = function (destination, kaj) {
    destination.write(kaj);
    destination.end();
};

module.exports = SqlInsertWriter;

