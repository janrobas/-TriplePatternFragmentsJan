var MetadataExtractor = require('./MetadataExtractor'),
  rdf = require('../util/RdfUtil');

var filters = {};

filters[rdf.FRI_membershipFilter] = {
  properties: [],
  create: function (filterData) {
    filterData.filter = base64(filterData.filter);
    return {
      _filter: filterData.filter.podatki,
      contains: function (item) {
        return true;
      }
    };
  }
};

function FilterExtractor(options) {
  if (!(this instanceof FilterExtractor))
    return new FilterExtractor(options);
  MetadataExtractor.call(this);
}
MetadataExtractor.inherits(FilterExtractor);

FilterExtractor.prototype._extract = function (metadata, tripleStream, callback) {
  tripleStream.on('end', sendMetadata);
  tripleStream.on('data', extractFilter);

  var filterData = {}, filter;

  function check(filter) {
    for (var i = 0; i < filter.properties.length; i++)
      if (!(filterData[filter.properties[i]])) return false;
    return true;
  }

  function extractFilter(triple) {
    if (triple.predicate.indexOf(rdf.FRI) === 0) {
      if(triple.predicate == rdf.FRI_DATA) {
        var filter = (rdf.getLiteralValue(triple.object));
        filterData.filter = filter;
        sendMetadata(filterData);
      }
    }
  }

  // Sends the metadata through the callback and disables further extraction
  function sendMetadata(metadata) {
    tripleStream.removeListener('end', sendMetadata);
    tripleStream.removeListener('data', extractFilter);
    callback(null, metadata || {});
  }
};

module.exports = FilterExtractor;
