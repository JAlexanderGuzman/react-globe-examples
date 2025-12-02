function URLparser() {
  this.queryString = location.search.substring(1);
  this.re = /([^&=]+)=([^&]*)/g;
  this.queryParameters = [];
  this.currentState = [];
}

URLparser.prototype.decode_url = function () {
  this.queryParameters = [];
  let m;
  while ((m = this.re.exec(this.queryString))) {
    this.queryParameters.push([
      decodeURIComponent(m[1]),
      decodeURIComponent(m[2]),
    ]);
  }
  return this.queryParameters;
};

URLparser.prototype.update_url = function (mode, type) {
  this.queryParameters = "mode=" + mode + "&id=" + type;
  const new_url =
    window.location.origin +
    window.location.pathname +
    "?" +
    this.queryParameters;
  history.replaceState({}, "Title", new_url);
  return this.queryParameters;
};

if (typeof window !== "undefined") {
  window.URLparser = URLparser;
}
