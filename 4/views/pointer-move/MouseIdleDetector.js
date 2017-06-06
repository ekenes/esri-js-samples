define([
  "dojo/_base/declare",
  "dojo/Evented",
  "dojo/on",
  "dojo/_base/lang",
], function(
  declare,
  Evented,
  on,
  lang
){

  function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
  };

  return declare("MouseIdleDetector", [Evented], {
    constructor: function(view, options) {
      this.started = false;
      this.view = view;
      options = options || {};
      this.interval = options.interval || 300; // milliseconds
    },

    /*****************
     * Public methods
     *****************/

    start: function() {
      if (this.started) {
        return;
      }

      console.log("[ Started ]");
      this.started = true;
      this._enable();
    },

    stop: function() {
      if (!this.started) {
        return;
      }

      console.log("[ Stopped ]");
      this.started = false;
      this._disable();
    },

    /*******************
     * Internal methods
     *******************/

    _enable: function() {
      this._disable();

      // mouse move handler
      this._moveHandle = this.view.on("pointer-move", debounce(this._idleCallback.bind(this), this.interval));
    },

    _disable: function() {
      if (this._moveHandle) {
        this._moveHandle.remove();
      }
    },

    _idleCallback: function(event) {
      this.emit("idle", event);
    }
  });
});