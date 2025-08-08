// Empty module to replace problematic next/document imports
// This prevents build errors when dependencies try to import Html, Head, Main, NextScript

module.exports = {};
module.exports.Html = function Html() { return null; };
module.exports.Head = function Head() { return null; };
module.exports.Main = function Main() { return null; };
module.exports.NextScript = function NextScript() { return null; };
module.exports.default = function Document() { return null; };