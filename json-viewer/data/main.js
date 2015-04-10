/* See license.txt for terms of usage */

define(function(require, exports, module) {

// ReactJS
var React = require("react");

// RDP Inspector
var { MainTabbedArea } = require("components/main-tabbed-area");
var { Resizer } = require("resizer");

/**
 * Render the main application component. It's the main tab bar displayed
 * at the top of the window. This component also represents ReacJS root.
 */
var content = document.getElementById("content");
var data = document.getElementById("data");
var input = {
  data: data.textContent
}

data.remove();

var theApp = React.render(MainTabbedArea(input), content);
var resizer = new Resizer(window, theApp);

// End of main.js
});