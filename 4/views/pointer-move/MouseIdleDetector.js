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

  return declare("MouseIdleDetector", [Evented], {
    constructor: function(view, options) {
      this.started = false;
      this.domNode = view.container;
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

      this._enterHandler = on(this.domNode, "mouseenter", this._enable.bind(this));
      this._leaveHandler = on(this.domNode, "mouseleave", this._disable.bind(this));
    },

    stop: function() {
      if (!this.started) {
        return;
      }

      console.log("[ Stopped ]");
      this.started = false;
      this._disable();
      this._enterHandler.remove();
      this._leaveHandler.remove();
      this._enterHandler = this._leaveHandler = null;
    },

    /*******************
     * Internal methods
     *******************/

    _enable: function() {
      this._disable();

      // mouse move handler
      this._moveHandle = on(this.view, "pointer-move", this._mouseMoveHandler.bind(this));

      // timer to detect idleness
      var self = this;
      this._timer = setInterval(function() {
        self._timerCallback.apply(self, []);
      }, this.interval);
    },

    _disable: function() {
      if (this._moveHandle) {
        this._moveHandle.remove();
      }

      clearInterval(this._timer);
      this._lastX = this._lastY = 0;
      this._distance = null;
    },

    _mouseMoveHandler: function(e) {
      var distance = this._distance || { x: 0, y: 0 };
      this._distance = distance;
      distance.x += Math.abs(e.pageX - this._lastX);
      distance.y += Math.abs(e.pageY - this._lastY);
      //console.log("moved.. ", dojo.toJson(distance));
      this._lastX = e.pageX;
      this._lastY = e.pageY;
      this._lastEvent = e;
    },

    _timerCallback: function() {
      //console.log("----- TIMER -----");
      var distance = this._distance;
      if (this._lastDistance && (!distance || (distance.x === 0 && distance.y === 0))) {
        console.log("-idle-");
        this.emit("idle", this._lastEvent);
      }
      this._lastDistance = distance;
      this._distance = null;
    }
  });
});