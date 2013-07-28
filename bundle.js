;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
(function(){/*global require:false*/

var raf = require("raf");

var demo = {};

demo.points = [];
demo.pointRadius = 5;

demo.interpolateFn = null;

// Get a sibling point specified by a signed offset.
// Offset 0 means the point itself.
demo.getSiblingPoint = function(index, siblingOffset) {
	var siblingPoint = this.points[index + siblingOffset];
	if (siblingPoint === undefined) {
		return;
	}
	return siblingPoint;
};

demo.getComponent = function(component, point) {
	return point[["x", "y"].indexOf(component)];
};

demo.render = function(dt) {
	var ctx = this.ctx;
	ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

	var points = this.points;
	var radius = this.pointRadius;
	var linearInterpolateFn = this.interpolateFns.linear;
	var interpolateFn = this.interpolateFn;
	var distanceFn = this.distanceBetweenPoints;
	var getSiblingPoint = this.getSiblingPoint;
	var getComponent = this.getComponent;

	var getPointFn = function(component, index, offset) { 
		var sibling = this.getSiblingPoint(index, offset);
		return sibling === undefined ? null : getComponent(component, sibling); 
	};

	points.forEach(function(point, j){
		var nextPoint = points[j + 1];
	
		if (nextPoint) {
			var distance = distanceFn(point, nextPoint);
			var distanceBetweenDraws = 1;
			var step = (distanceBetweenDraws / distance);

			ctx.fillStyle = "#ccc";
			for (var i = 0; i < 1; i += step) {		
				var x = linearInterpolateFn(getPointFn.bind(this, "x", j), i);
				var y = interpolateFn(getPointFn.bind(this, "y", j), i);
				ctx.fillRect(x - radius, y - radius, 1, 1);
			}
		}

		// Mark the point.
		ctx.fillStyle = "#000";
		ctx.beginPath();
		ctx.arc(point[0] - radius, point[1] - radius, radius, 0, Math.PI * 2);
		ctx.fill();

	}, this);

};

demo.interpolateFns = {
	linear: function(fn, m) {
		var a = fn(0);
		var b = fn(1);
		return (a * (1 - m) + b * m);
	},
	cosine: function(fn , m) {
		var a = fn(0);
		var b = fn(1);
		var m2 = (1 - Math.cos(m * Math.PI)) / 2;
		return a * (1 - m2) + b * m2;
	},
	cubic: function(fn, m) {
		var b = fn(0);
		var a = fn(-1) || b;
		var c = fn(1);
		var d = fn(2) || c;
		var m2 = Math.pow(m, 2);
		var a0 = d - c - a + b;
		var a1 = a - b - a0;
		var a2 = c - a;
		var a3 = b;
		return a0 * m * m2 + a1 * m2 + a2 * m + a3;
	},
	hermine: function(fn, m) {
		var b = fn(0);
		var a = fn(-1) || b;
		var c = fn(1);
		var d = fn(2) || c;
		var tension = 0;
		var bias = 0;
		var m0 = (b - a) * (1 + bias) * (1 - tension) / 2 + (c - b) * (1 - bias) * (1 - tension) / 2;
		var m1 = (c - b) * (1 + bias) * (1 - tension) / 2 + (d - c) * (1 - bias) * (1 - tension) / 2;
		var mu2 = Math.pow(m, 2); 
		var mu3 = mu2 * m;
		var a0 = 2 * mu3 - 3 * mu3 + 1;
		var a1 = mu3 - 2 * mu2 + m;
		var a2 = mu3 - mu2;
		var a3 = -2 * mu3 + 3 * mu2;
		return a0 * b + a1 * m0 + a2 * m1 + a3 * c;  
	}
};

demo.distanceBetweenPoints = function(pointA, pointB) {
	return Math.sqrt(Math.pow(pointB[0] - pointA[0], 2) + Math.pow(pointB[1] - pointA[1], 2));
};

demo.clear = function () {
	this.points.length = 0;
};

demo.random = function () {
	var x = 0;
	var y;
	for (var i = 0; i < 10; i++) {
		x = (Math.random() * (this.canvas.width / 10)) + ((this.canvas.width / 10) * i);
		y = (Math.random() * this.canvas.height);
		this.points.push([x, y]);
		console.log(x,y)
	}
};

demo.init = function() {
	this.canvas = document.querySelector("canvas");
	this.ctx = this.canvas.getContext("2d");
	this.ee = raf(this.canvas).on("data", this.render.bind(this));

	demo.pointPlacer();
	demo.tools();
};

demo.tools = function() {
	document.querySelector("fieldset").addEventListener("click", function(event) {

		var fn = {
			"button": function() {
				this[event.target.id]();
			},
			"input": function() {
				this.interpolateFn = this.interpolateFns[event.target.value];
			}
		}[event.target.tagName.toLowerCase()];

		if (fn) { fn.call(this); }

	}.bind(this));

	this.interpolateFn = demo.interpolateFns.linear;
};

demo.pointPlacer = function() {
	var activePointIndex = null;
	var radius = this.pointRadius;
	var canvas = this.canvas;
	var getCoords = function(event) {
		return [event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop];
	};
	var pointCollision = function(pointA, pointB) {
		return Math.pow(pointA[0] - pointB[0], 2) + Math.pow(pointA[1] - pointB[1], 2) < Math.pow(radius * 2, 2);
	};

	this.canvas.addEventListener("mousedown", function(event) {

		if ( ! this.points.length) {
			return;
		}

		var coords = getCoords(event);
		var collision = ! this.points.some(function(point, index) {
			activePointIndex = index;
			return pointCollision(point, coords);
		});

		if (collision) {
			activePointIndex = null;
			return;
		}

	}.bind(this));

	this.canvas.addEventListener("mousemove", function(event) {
		if (activePointIndex === null) {
			return;
		}

		this.points[activePointIndex] = getCoords(event);
	}.bind(this));

	this.canvas.addEventListener("mouseup", function(event) {

		if (activePointIndex !== null) {
			activePointIndex = null;
			return;
		}

		var coords = getCoords(event);
		var collision = this.points.some(function(point) {
			return pointCollision(point, coords);
		});

		if (collision) {
			return;
		}

		this.points.push(coords);
	}.bind(this));
};

demo.init();





})()
},{"raf":2}],2:[function(require,module,exports){
(function(){module.exports = raf

var EE = require('events').EventEmitter
  , global = typeof window === 'undefined' ? this : window
  , now = global.performance && global.performance.now ? function() {
    return performance.now()
  } : Date.now || function () {
    return +new Date()
  }

var _raf =
  global.requestAnimationFrame ||
  global.webkitRequestAnimationFrame ||
  global.mozRequestAnimationFrame ||
  global.msRequestAnimationFrame ||
  global.oRequestAnimationFrame ||
  (global.setImmediate ? function(fn, el) {
    setImmediate(fn)
  } :
  function(fn, el) {
    setTimeout(fn, 0)
  })

function raf(el) {
  var now = raf.now()
    , ee = new EE

  ee.pause = function() { ee.paused = true }
  ee.resume = function() { ee.paused = false }

  _raf(iter, el)

  return ee

  function iter(timestamp) {
    var _now = raf.now()
      , dt = _now - now
    
    now = _now

    ee.emit('data', dt)

    if(!ee.paused) {
      _raf(iter, el)
    }
  }
}

raf.polyfill = _raf
raf.now = now


})()
},{"events":3}],4:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

})(require("__browserify_process"))
},{"__browserify_process":4}]},{},[1])
;