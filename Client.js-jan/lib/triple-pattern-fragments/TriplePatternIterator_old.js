/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */
/* A TriplePatternIterator builds bindings by reading matches for a triple pattern. */


//var predicates = ['http://db.uwaterloo.ca/~galuc/wsdbm/hasGenre'];


var MultiTransformIterator = require('../iterators/MultiTransformIterator'),
    rdf = require('../util/RdfUtil'),
    Logger = require('../util/ExecutionLogger')('TriplePatternIterator')
    Iterator = require('../iterators/Iterator'),
    BloomFilter = require('bloem').Bloem
    base64 = require('base64-arraybuffer').decode,
    _ = require('lodash');

var args = require('minimist')(process.argv.slice(2));

// Creates a new TriplePatternIterator
function TriplePatternIterator(parent, pattern, options) {
  if (!(this instanceof TriplePatternIterator))
    return new TriplePatternIterator(parent, pattern, options);
  MultiTransformIterator.call(this, parent, options);

  this._pattern = pattern;
  this._client = this._options.fragmentsClient;
  this._filter = "";
}
MultiTransformIterator.inherits(TriplePatternIterator);
/*
// Creates a fragment with triples that match the binding of the iterator's triple pattern
TriplePatternIterator.prototype._createTransformer = function (bindings, options) {
  // Apply the bindings to the iterator's triple pattern
  var boundPattern = rdf.applyBindings(bindings, this._pattern);

  // Retrieve the fragment that corresponds to the resulting pattern
  var fragment = this._client.getFragmentByPattern(boundPattern);
  Logger.logFragment(this, fragment, bindings);
  fragment.on('error', function (error) { Logger.warning(error.message); });
  return fragment;
};
*/

TriplePatternIterator.prototype._createTransformer = function (bindings, options) {
  var boundPattern = rdf.applyBindings(bindings, this._pattern);
  var fragment;
  var self = this;

  if(!rdf.hasVariables(boundPattern)) {
    fragment = new Iterator.PassthroughIterator();
    var exists = true;

    if(bindings.filter/* && _.contains(predicates, boundPattern["predicate"])*/) {
      var filterFields = bindings.filter.split(',');

      var filterStr = new Buffer(filterFields[2], 'base64');

      var bloomFilter =  new BloomFilter(filterFields[0], filterFields[1], filterStr);

      if(!rdf.isVariable(bindings._pattern.predicate) && (!rdf.isVariable(bindings._pattern.subject) || !rdf.isVariable(bindings._pattern.object))) {
        var testStr = boundPattern.subject + "|" + boundPattern.predicate + "|" + boundPattern.object;

        if(filterFields[0] == 0) {
          exists = false;
        } else {
          exists = bloomFilter.has(Buffer(testStr));
        }
      } else if(!rdf.isVariable(bindings._pattern.predicate)) { // if the only variable is predicate
        var parent = rdf.removeBindings(bindings, this._pattern);

        // if we are testing membership of triple, linked with the object, then we have to make the membership query, because we don't have data about the object ("Jan 2" extension)
        if(parent["subject"] != bindings._pattern.object && parent["object"] != bindings._pattern.object) {
          var testStr = boundPattern.subject + "|" + boundPattern.predicate + "|" + boundPattern.object;

          if(filterFields[0] == 0) {
            exists = false;
          } else {
            exists = bloomFilter.has(Buffer(testStr));
          }
        }
      }
    }

    if (exists) {
      fragment.setSource(self._client.getFragmentByPattern(boundPattern));
    } else {
      fragment.setSource(Iterator.empty());
    }
  } else {
    fragment = self._client.getFragmentByPattern(boundPattern);
  }

  Logger.logFragment(this, fragment, bindings);
  fragment.on('error', function (error) { Logger.warning(error.message); });

  return fragment;
};

/*
// Reads a binding from the given fragment
TriplePatternIterator.prototype._readTransformer = function (fragment, fragmentBindings) {
  // Read until we find a triple that leads to consistent bindings
  var triple;
  while (triple = fragment.read()) {
    // Extend the bindings such that they bind the iterator's pattern to the triple
    try { return rdf.extendBindings(fragmentBindings, this._pattern, triple); }
    catch (bindingError) { /- non-data triple, didn't match the bindings -/ }
  }
  // No consistent bindings were available (yet)
  return null;
};
*/


// Reads a binding from the given fragment
TriplePatternIterator.prototype._readTransformer = function (fragment, fragmentBindings) {
  // Read until we find a triple that leads to consistent bindings
  var triple;
  while (triple = fragment.read()) {
    // Extend the bindings such that they bind the iterator's pattern to the triple
    try {
       var r = rdf.extendBindings(fragmentBindings, this._pattern, triple);
       r.filter = triple.filter;
       r._pattern = this._pattern;
       return r;
     }
    catch (bindingError) { /* non-data triple, didn't match the bindings */ }
  }
  // No consistent bindings were available (yet)
  return null;
};
// Generates a textual representation of the iterator
TriplePatternIterator.prototype.toString = function () {
  return '[' + this.constructor.name +
         ' {' + rdf.toQuickString(this._pattern) + ')}' +
         '\n  <= ' + this.getSourceString();
};

module.exports = TriplePatternIterator;
