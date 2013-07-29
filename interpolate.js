/*global require:false*/

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

	if ( ! points.length) {
		return;
	}

	var getPointFn = function(component, index, offset) { 
		var sibling = this.getSiblingPoint(index, offset);
		return sibling === undefined ? null : getComponent(component, sibling); 
	};
	
	ctx.moveTo(points[0][0], points[0][1]);

	points.forEach(function(point, j){
		var nextPoint = points[j + 1];
		var distanceBetween;
		var distanceRemaining;
		var sign;
		var m;
		var x;
		var y;

		ctx.strokeStyle = "#ccc";
		ctx.beginPath();
	
		if (nextPoint) {
			distanceBetween = distanceRemaining = nextPoint[0] - point[0];
			sign = distanceBetween > 0 ? 1 : -1;
			ctx.lineTo(point[0] - radius, point[1] - radius);
			do {
				distanceRemaining -= 2 * sign;
				m = 1 - (distanceRemaining / distanceBetween);
				x = linearInterpolateFn(getPointFn.bind(this, "x", j), m);
				y = interpolateFn(getPointFn.bind(this, "y", j), m);
				ctx.lineTo(x - radius, y - radius);
			} while (Math.abs(distanceRemaining) > 0 && m < 1);	
		} 

		ctx.stroke();
		ctx.closePath();

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
		var a0 = 2 * mu3 - 3 * mu2 + 1;
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
		var collision = this.points.some(function(point, index) {
			activePointIndex = index;
			return pointCollision(point, coords);
		});

		if ( ! collision) {
			activePointIndex = null;
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