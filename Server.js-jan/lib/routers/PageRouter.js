/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A PageRouter routes page numbers to offsets */

// Creates a new PageRouter with the given page size, which defaults to 100.
function PageRouter(config) {
  if (!(this instanceof PageRouter))
    return new PageRouter(config);
  config = config || {};
  this.pageSize =  isFinite(config.pageSize) && config.pageSize > 1 ? ~~config.pageSize : 100;
}

// Extracts a page parameter from the request and adds it to the query
PageRouter.prototype.extractQueryParams = function (request, query) {
  var page = request.url && request.url.query && request.url.query.page,
      features = query.features || (query.features = {});

  // Set the limit to the page size
  features.limit = true, query.limit = this.pageSize;

  // If a page is given, adjust the offset
  if (page && /^\d+$/.test(page) && (page = parseInt(page, 10)) > 1)
    features.offset = true, query.offset = this.pageSize * (page - 1);
};

module.exports = PageRouter;
