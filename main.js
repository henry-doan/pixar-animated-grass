var CONTROL_POINT_SIZE = 15;
var SEGMENTS = 3;
var BACKGROUND = color(240, 250, 255);
var RED = color(200, 0, 0);
var PINK = color(255, 0, 175);
var ORANGE = color(255, 165, 0);
var TEXTCOL = color(20, 20, 20);
var TOOLBAR = color(230, 230, 230, 200);
var MESSAGEBLUE = color(20, 60, 160);
var TOOLBARCOL = color(225, 225, 225, 180);

var sansFont = createFont("sans", 15);

var selectedPoint = false;
var grass;

// Recording variables
var mode = 'Start';
var recordedPoints = [];
var MAX_RECORDED_POINTS = 160;

var toolbar;
var toolbarX = width * 0.01;
var toolbarWidth = 128;

var drawMultiple = true;
var bladesOfGrass = 250;
var triedOffset = false;

// Base of main blade of grass
var grassX = width * 0.5;

// Given the end points of two lines (x1, y1) to (x2, y2) and (x3, y3) to (x4, y4),
// return the point where they intersect
// Assume lines do intersect (i.e. are not parallel and are not segments)
var findIntersection = function(x1, y1, x2, y2, x3, y3, x4, y4) {
    var dx1 = (x1 - x2);
    var dx2 = (x3 - x4);
    var dy1 = (y1 - y2);
    var dy2 = (y3 - y4);
    var d = dx1 * dy2 - dy1 * dx2;
    return [(dx2 * (x1 * y2 - y1 * x2) - dx1 * (x3 * y4 - y3 * x4)) / d,
            (dy2 * (x1 * y2 - y1 * x2) - dy1 * (x3 * y4 - y3 * x4)) / d];
};

/**************************************
 *  Generic GUI component from which
 * other elements inherit
 * 
 * The default object is basically a
 * button
***************************************/
{
var GUI_Component = function(x, y, w, h, name, updateFunction) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    
    this.name = name;
    this.updateFunction = updateFunction;
    
    this.showing = true;
    this.selected = false;
    this.disabled = false;
};

GUI_Component.prototype.draw = function() {
    if (!this.showing) { return; }
    
    if (this.mouseOver()) {
        fill(100);
    } else {
        fill(200);
    }
    
    noStroke();
    rect(this.x, this.y, this.w, this.h, 12);
    
    fill(TEXTCOL);
    textFont(sansFont, 15);
    textAlign(CENTER, CENTER);
    text(this.name, this.x + this.w / 2, this.y + this.h/2 + 1);
};

GUI_Component.prototype.mouseOver = function() {
    return (mouseX >= this.x && mouseX <= this.x + this.w &&
            mouseY >= this.y && mouseY <= this.y + this.h);
};

GUI_Component.prototype.mousePressed = function() {
    this.selected = this.mouseOver();
};

GUI_Component.prototype.mouseDragged = function() {};

GUI_Component.prototype.mouseReleased = function() {
    if (this.selected && this.showing && !this.deactivated && this.mouseOver()) {
        this.trigger();
    }
    this.selected = false;
};

GUI_Component.prototype.trigger = function() {
    if (this.updateFunction) {
        this.updateFunction();
    }
};
}
/**************************************
 *  GUI Button
***************************************/
{
var Button = function(x, y, w, h, name, updateFunction) {
    GUI_Component.call(this, x, y, w, h, name, updateFunction);

    this.defaultCol = TOOLBAR;
    this.highlightCol = color(210, 210, 210, 250);
    this.transition = 0;
};
Button.prototype = Object.create(GUI_Component.prototype);

Button.prototype.draw = function() {
    if (!this.showing) { return; }
    
    this.fade();
    
    if (this.deactivated) {
        fill(180);
        noStroke();
    } else {
        fill(lerpColor(this.defaultCol, this.highlightCol, this.transition / 10));
        strokeWeight(1);
        stroke(200);
    }
    
    rect(this.x, this.y - 1, this.w, this.h + 3, 12);
    
    if (this.deactivated) {
        fill(120);
    } else {
        fill(TEXTCOL);
    }
    
    textFont(sansFont, 15);
    textAlign(CENTER, CENTER);
    text(this.name, this.x + this.w / 2, this.y + this.h/2 + 1);
};

Button.prototype.fade = function() {
    if (this.mouseOver() || this.selected) {
        this.transition = min(10, this.transition + 1);
    } else {
        this.transition = max(0, this.transition - 1);
    }
};

var FilledSButtonDraw = function() {
    if (!this.showing) { return; }
    
    this.fade();
    
    noFill();
    fill(lerpColor(this.defaultCol, this.highlightCol, this.transition / 10));

    stroke(this.highlightCol);
    strokeWeight(1);
    rect(this.x, this.y - 1, this.w, this.h + 3, 19);
    
    if (this.deactivated) {
        fill(120);
    } else {
        fill(lerpColor(this.highlightCol, color(255, 255, 255), this.transition / 10));
    }
    
    textFont(sansFont, 16);
    textAlign(CENTER, CENTER);
    text(this.name, this.x + this.w / 2, this.y + this.h/2);
};

Button.prototype.makeFilled = function(col) {
    this.draw = FilledSButtonDraw.bind(this);
    this.defaultCol = color(0, 0, 0, 1);
    this.highlightCol = col;
};
}
/**************************************
 * GUI Slider to vary parameters
***************************************/
{
var Slider = function(x, y, w, minValue, maxValue, nowValue, name, updateFunction) {
    GUI_Component.call(this, x, y, w, 12, name, updateFunction);
    
    this.x2 = x + w;
    this.ballR = 8;
    this.ballD = this.ballR * 2;
    
    this.min = minValue;
    this.max = maxValue;
    this.val = nowValue === undefined ? minValue : nowValue;
    this.setValue(this.val);
    
    this.held = false;
};
Slider.prototype = Object.create(GUI_Component.prototype);

Slider.prototype.draw = function() {
    if (!this.showing) { return; }
    
    if (this.name) {
        fill(TEXTCOL);
        textSize(15);
        textAlign(CENTER, BASELINE);
        text(this.name + ": " + this.val,  this.x + this.w / 2, this.y - 13);
    }
    
    noStroke();
    fill(180);
    rect(this.x - 8, this.y - this.h/2, this.w + 16, this.h, 8);

    strokeWeight(1);
    stroke(0, 0, 0, 120);
    fill(180, 180, 250);
    ellipse(this.bx, this.y, this.ballD, this.ballD);
    noStroke();
    fill(255, 255, 255, 150);
    ellipse(this.bx - this.ballR * 0.3, this.y - this.ballR * 0.3, 5, 5);

};

Slider.prototype.mouseOver = function() {
    return dist(mouseX, mouseY, this.bx, this.y) < this.ballR;
};

Slider.prototype.mouseDragged = function() {
    if (this.selected) {
        this.bx = constrain(mouseX, this.x, this.x2);
        this.val = round(map(this.bx, this.x, this.x2, this.min, this.max));
        this.trigger();
        return true;
    }
};

Slider.prototype.trigger = function() {
    if (this.updateFunction) {
        this.updateFunction(this.val);
    }
};

Slider.prototype.setValue = function(v) {
    this.val = constrain(v, this.min, this.max);
    this.bx = map(this.val, this.min, this.max, this.x, this.x2);
};
}
/**************************************
 *      Toolbar
 *  Contains other GUI elements
***************************************/
{
var Toolbar = function(x, y, w) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = 7;
    
    this.buttons = [];
    this.sliders = [];
    this.components = [];
};

Toolbar.prototype.draw = function() {
    noStroke();
    fill(230, 230, 230, 200);
    rect(this.x, this.y, this.w, this.h, 8);
   
    for (var i = 0; i < this.components.length; i++) {
        this.components[i].draw();
    }
};

Toolbar.prototype.addButton = function(name, updateF, params) {
    params = params || {};
    var h = params.h || 18;
    var x = params.x || this.x + 5;
    var y = params.y || this.y + this.h;
    var w = params.w || this.w - 10;
    var button = new Button(x, y, w, h, name, updateF);
    
    this.buttons.push(button);
    this.components.push(button);
    this.h += h + 8;
};

Toolbar.prototype.addSlider = function(minX, maxX, nowX, name, updateF) {
    var h = name ? 24 : 10;
    var x = this.x + 15;
    var y = this.y + this.h + h;
    var w = this.w - 30;
    var slider = new Slider(x, y, w, minX, maxX, nowX, name, updateF);
    
    this.sliders.push(slider);
    this.components.push(slider);
    this.h += h + 16;
};

Toolbar.prototype.mousePressed = function() {
    for (var i = 0; i < this.components.length; i++) {
        this.components[i].mousePressed();
    }
};

Toolbar.prototype.mouseReleased = function() {
    for (var i = 0; i < this.components.length; i++) {
        this.components[i].mouseReleased();
    }
};

Toolbar.prototype.mouseDragged = function() {
    for (var i = 0; i < this.sliders.length; i++) {
        if (this.sliders[i].mouseDragged()) {
            return true;
        }
    }
};
}
/**************************************
 * DraggablePoint
 * A freely draggable point with a position and colour.
***************************************/
{
var DraggablePoint = function(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color || ORANGE;
    this.animation = 0;
};

DraggablePoint.prototype.draw = function() {
    if (this.dragging || this.mouseOver()) {
        if (this.animation < 5) {
            this.animation++;
        }
    } else {
        this.animation = 0;
    }

    strokeWeight(1);
    stroke(BACKGROUND);
    if (this.selected) {
        fill(PINK);
    } else {
        fill(this.color);
    }
    
    var r = CONTROL_POINT_SIZE + this.animation;
    ellipse(this.x, this.y, r, r);
};

DraggablePoint.prototype.mouseOver = function() {
    return dist(mouseX, mouseY, this.x, this.y) <= CONTROL_POINT_SIZE / 2;
};

DraggablePoint.prototype.move = function(dx, dy) {
    this.x += dx;
    this.y += dy;
};
}
/*********************************************************************
 * A curve fixed at point (x1, y2) and curving towards (x2, y2)
 * The degree of curve depends on the length to the third control point
*********************************************************************/

var Curve = function(x1, y1, x2, y2, length) {
    this.length = length;
    this.p1 = new DraggablePoint(x1, y1);
    this.p2 = new DraggablePoint(x2, y2);
    this.p3 = new DraggablePoint(0, 0);
    this.controlPoints = [this.p2, this.p3];
    
    this.directAngle = 0;   // Angle between ends p1 and p2
    this.apexAngle = 0;     // Angle between base, p1, and apex, p3
    
    this.splinePoints = [];
    this.outlinePoints = [];
    
    // Find the angle from p1 to p3 relative to the line between p1 and p2
    this.findApexPoint = function() {
        this.directAngle = atan2(this.p2.y - this.p1.y, this.p2.x - this.p1.x);
        var midLength = dist(this.p1.x, this.p1.y, this.p2.x, this.p2.y) * 0.5;
        var midX = (this.p1.x + this.p2.x) * 0.5;
        var midY = (this.p1.y + this.p2.y) * 0.5;
        
        // Points stretched in a line
        if (midLength > this.length) { this.length = midLength; }
        var d = sqrt(this.length * this.length - midLength * midLength);
        var angle = this.apexAngle < 0 ? this.directAngle - 90 : this.directAngle + 90;
        
        this.p3.x = midX + d * cos(angle);
        this.p3.y = midY + d * sin(angle);
        this.apexAngle = atan2(this.p3.y - this.p1.y, this.p3.x - this.p1.x) - this.directAngle;
    };
    this.findApexPoint();
    
    // Fill splinePoints array with points along the curve
    this.createSpline = function() {
        var n = SEGMENTS;
        var x1 = this.p1.x;
        var y1 = this.p1.y;
        var x2 = this.p2.x + this.length * n / (n + 1) * this.ca2;
        var y2 = this.p2.y + this.length * n / (n + 1) * this.sa2;
        var l = this.length / (n + 1);
        
        this.splinePoints = [];
        for (var i = 1; i <= n; i++) {
            var len1 = l * i;
            var len2 = l * (n - i);
            var x3 = this.p1.x + len1 * this.ca1;
            var y3 = this.p1.y + len1 * this.sa1;
            var x4 = this.p2.x + len2 * this.ca2;
            var y4 = this.p2.y + len2 * this.sa2;
            var coord = findIntersection(x1, y1, x2, y2, x3, y3, x4, y4);
            
            x1 = coord[0];
            y1 = coord[1];
            x2 = x4;
            y2 = y4;
            this.splinePoints.push([x1, y1]);
        }
        this.splinePoints.push([x2, y2]);
        
        if (mode === 'Recording') {
            recordedPoints.push(this.splinePoints);
            if (recordedPoints.length > MAX_RECORDED_POINTS) {
                mode = 'Pause';
                toolbar.buttons[0].selected = false;
            }
            if (toolbar.buttons[1].deactivated && recordedPoints.length > 1) {
                toolbar.buttons[1].deactivated = false;
            }
        }
    };
    
    // Move tip
    this.updatePoint = function() {
        this.p2.x += mouseX - pmouseX;
        this.p2.y += mouseY - pmouseY;
        
        this.directAngle = atan2(this.p2.y - this.p1.y, this.p2.x - this.p1.x);
        var midLength = dist(this.p1.x, this.p1.y, this.p2.x, this.p2.y) * 0.5;
        
        // Points stretched in a line
        if (midLength >= this.length) {
            this.p2.x = this.p1.x + (2 * this.length - 1)* cos(this.directAngle);
            this.p2.y = this.p1.y + (2 * this.length - 1) * sin(this.directAngle);
        }
        
        this.findApexPoint();
    };
    
    // Find angle between the end points and the apex point
    this.update = function() {
        // Set position p3
        this.p3.x = this.p1.x + this.length * cos(this.apexAngle + this.directAngle);
        this.p3.y = this.p1.y + this.length * sin(this.apexAngle + this.directAngle);
        
        // Angle from p1 to p3
        this.ca1 = cos(this.apexAngle + this.directAngle);
        this.sa1 = sin(this.apexAngle + this.directAngle);
        
        // Angle from p2 to p3
        var angle = atan2(this.p3.y - this.p2.y, this.p3.x - this.p2.x);
        this.ca2 = cos(angle);
        this.sa2 = sin(angle);
        this.createSpline();
    };
    
    this.update();
};

// Draw a line connecting an array of points
Curve.prototype.drawConnectedPoints = function(points) {
    var x1 = this.p1.x;
    var y1 = this.p1.y;
    
    for (var i = 0; i < points.length; i++) {
        var x2 = points[i][0];
        var y2 = points[i][1];
        line(x1, y1, x2, y2);
        x1 = x2;
        y1 = y2;
    }
};

// Given two arrays of points of the same length,
// draw a line consisting of the interpolation of the ith point in each array
// p is the weighting to the first array (1-p) is the weighting to the second
Curve.prototype.drawInterpolatedPoints = function(points1, points2, p) {
    var x1 = this.p1.x;
    var y1 = this.p1.y;
    
    for (var i = 0; i < points1.length; i++) {
        var x2 = lerp(points1[i][0], points2[i][0], p);
        var y2 = lerp(points1[i][1], points2[i][1], p);
        line(x1, y1, x2, y2);
        x1 = x2;
        y1 = y2;
    }
};

// Map an integer into the range 0 to MAX_RECORDED_POINTS - 1
// in such a way that numbers go up from 0 to max, then max to 0 and so on.
// Means that the recorded loop goes forwards then backwards to avoid jumping.
var getPointInLoop = function(t) {
    var maxPoints = recordedPoints.length - 1;
    var x = (recordedPoints.length + t) % (2 * maxPoints);
    return maxPoints - abs(x - maxPoints);
};

Curve.prototype.drawManyBlades = function(useRecorded) {
    var _scale = 0.1;
    strokeWeight(12);
    
    for (var i = 0; i < grass.length; i++) {
        var g = grass[i];
        translate(g.x, g.y);
        stroke(g.c);
        scale(_scale, _scale);
        translate(-this.p1.x, -this.p1.y);
        if (useRecorded) {
            var n = frameCount + i * toolbar.sliders[0].val / 25;
            var p1 = getPointInLoop(n);
            var p2 = getPointInLoop(n + 1);
            var proportion = floor(p1) - p1 + 1;
            var points1 = recordedPoints[floor(p1)];
            var points2 = recordedPoints[floor(p2)];
            this.drawInterpolatedPoints(points1, points2, proportion);
        } else {
            this.drawConnectedPoints(this.splinePoints);
        }
        resetMatrix();
    }
};

// Main Curve draw function
Curve.prototype.draw = function() {
    if (mode !== 'Play') {
        if (this.splinePoints.length > 0) {
            stroke(0, 180, 0);
            strokeWeight(4);
            this.drawConnectedPoints(this.splinePoints);
        }
        if (drawMultiple) {
            this.drawManyBlades();
        }

        for (var i = 0; i < this.controlPoints.length; i++) {
            this.controlPoints[i].draw();
        }   
    } else {
        if (recordedPoints.length > 1) {
            stroke(0, 180, 0);
            strokeWeight(4);
            var t = getPointInLoop(frameCount);
            this.drawConnectedPoints(recordedPoints[t]);
            
            if (drawMultiple) {
                this.drawManyBlades(true);
            }
        } else {
            toolbar.buttons[1].selected = false;
            mode = 'Pause';
        }
    }
};

Curve.prototype.selectPoint = function() {
    for (var i = 0; i < this.controlPoints.length; i++) {
        if (this.controlPoints[i].mouseOver()) {
            selectedPoint = i;
        }
    }
};

Curve.prototype.mouseDrag = function() {
    if (selectedPoint !== false) {
        if (mode === 'Record') {
            mode = 'Recording';
            recordedPoints = [];
            toolbar.buttons[0].defaultColor = RED;
            toolbar.buttons[0].highlightColor = color(230, 40, 40);
        }
        
        if (selectedPoint === 0) {
            this.updatePoint();
        } else {
            this.apexAngle = atan2(mouseY - this.p1.y, mouseX - this.p1.x) - this.directAngle;
            var d = 2 * this.length * cos(this.apexAngle);
            this.p2.x = this.p1.x + d * cos(this.directAngle);
            this.p2.y = this.p1.y + d * sin(this.directAngle);
        }
        this.update();
    }
};

/**************************************
 * Creation of objects
***************************************/
var lawnY = height * 0.95;    // Y-coordinate of lawn
var lawnW = 180;    // Width of lawn
var lawnX = (width - lawnW) / 2;    // Start of lawn
var lawnX2 = lawnX + lawnW;
var lawnDX = 24;
var lawnDY = 24;

var createLawn = function() {
    var grass = [];
    var rows = lawnDY / 2 - 1;
    var bladePerRow = bladesOfGrass / rows;
    var dx = (lawnW - 10) / bladePerRow;
    var grad = lawnDX / lawnDY;
    
    for (var x = 0; x < bladePerRow; x++) {
        for (var y = 1; y <= rows; y++) {
            grass.push({
                x: lawnX + x * dx + grad * 2 * (rows - y) + random(0, dx) + 5,
                y: lawnY - lawnDY + y * 2 + 1,
                c: color(random(0, 40), random(60, 200), 10),
                d: x*x + y*y
            });
        }
    }
    
    // Create grass in circle,
    // So waves appear as circles
    grass = grass.sort(function(a, b) {
        return a.d - b.d;
    });
    
    return grass;
};

grass = createLawn();

var recordFunc = function() {
    mode = 'Record';
};

var playPauseFunc = function() {
    if (this.name === 'Play') {
        mode = 'Play';
        this.name = 'Pause';
    } else {
        mode = 'Pause';
        this.name = 'Play';
    }
};

var offsetFunc = function() {
    triedOffset = true;
};

toolbar = new Toolbar(toolbarX, toolbarX, toolbarWidth);
toolbar.addButton("Record", recordFunc, {h : 21});
toolbar.addButton("Play", playPauseFunc);
toolbar.buttons[1].deactivated = true;
toolbar.addSlider(-50, 50, 0, "Offset", offsetFunc);
toolbar.buttons[0].makeFilled(color(200, 0, 0));

var myCurve = new Curve(
    grassX, height * 0.8,
    grassX + 20, height * 0.3,
    height * 0.35
);

/**************************************
 *  Draw tooltip
***************************************/

var drawArrow = function(x1, y1, x2, y2) {
    var angle = atan2(y2 - y1, x2 - x1);
    var d = dist(x1, y1, x2, y2) * 0.3;
    
    var cx1 = x1;
    var cy1 = y1;
    var cx2 = x2;
    var cy2 = y2;
    var angle2 = angle + 20;
    
    if (angle > 45 && angle < 135) {
        cx1 += d * cos(angle + 40);
        cy1 += d * sin(angle + 40);
        cx2 -= d * cos(angle - 40);
        cy2 -= d * sin(angle - 40);
        angle2 = angle - 40;
    } else {
        cx1 += d * cos(angle - 20);
        cy1 += d * sin(angle - 20);
        cx2 -= d * cos(angle + 20);
        cy2 -= d * sin(angle + 20);
    }
    
    //ellipse(cx1, cy1, 8, 8);ellipse(cx2, cy2, 8, 8);
    
    noFill();
    strokeWeight(3);
    stroke(MESSAGEBLUE);
    bezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2);
    
    noStroke();
    fill(MESSAGEBLUE);
    pushMatrix();
    translate(x2, y2);
    rotate(angle2);
    triangle(8, 0, -5, 4, -5, -4);
    popMatrix();
};

var drawMessage = function(message, x, y, x1, y1) {
    textFont(sansFont, 15);
    textLeading(18);
    
    var nLines = message.split("\n").length;
    var w = textWidth(message) + 20;
    var h = nLines * 22 + 3;
    
    strokeWeight(3);
    stroke(MESSAGEBLUE);
    fill(255);
    rect(x - w / 2, y, w, h, 20);
    
    textAlign(CENTER, CENTER);
    fill(20);
    text(message, x, y + h / 2);
    
    if (x1) {
        if (x1 < x - w/2) {
            drawArrow(x - w / 2, y + h / 2, x1, y1);
        } else {
            drawArrow(x, y + h + 1, x1, y1);
        }
    }
};

var drawToolTips = function() {
    var message, x, y;
    
    switch(mode) {
        case 'Start':
            toolbar.buttons[1].name = 'Play';
            message = "Press Record to save " + MAX_RECORDED_POINTS + " frames of movement.";
            x = 140;
            y = toolbar.buttons[0].y + 13;
            break;
        case 'Record':
            toolbar.buttons[1].name = 'Play';
            message = "Move the control points to begin recording.";
            x = myCurve.controlPoints[0].x - 12;
            y = myCurve.controlPoints[0].y - 10;
            break;
        case 'Recording':
            message = "Recorded " + recordedPoints.length + " frames.";
            break;
        case 'Pause':
            x = 140;
            y = toolbar.buttons[1].y + 13;
            message = "Press Play to show the recorded movement.";
            break;
        case 'Play':
            x = 140;
            if (triedOffset) {
                message = "Try recording a new animation.\nMove on to the next video when\nyou're happy with your animation.";
                y = toolbar.buttons[0].y + 13;
            } else {
                message = "Try changing the offset.";
                y = toolbar.sliders[0].y;
            }
            break;
    }
    drawMessage(message, width / 2, toolbarX, x, y);
};

/**************************************
 * Draw functions
***************************************/

var drawLawn = function() {
    noStroke();
    fill(184, 103, 50);

    var lawnY2 = lawnY - lawnDY;
    quad(lawnX - 5, lawnY + 1,
         lawnX2, lawnY + 1,
         lawnX2 + lawnDX, lawnY2,
         lawnX + lawnDX - 5, lawnY2);
    fill(145, 80, 40);
    rect(lawnX - 5, lawnY + 1, lawnW + 5, 5);
    fill(230, 151, 106);
    quad(lawnX2, lawnY + 1,
         lawnX2 + lawnDX, lawnY2,
         lawnX2 + lawnDX, lawnY2 + 5,
         lawnX2, lawnY + 5);

    /*
    stroke(184, 103, 50);
    strokeWeight(8);
    line(lawnX + 4, lawnY, lawnX + lawnW, lawnY);
    */
};

/**************************************
 * Main Loop
***************************************/

draw = function() {
    background(BACKGROUND);
    drawLawn();
    myCurve.draw();
    toolbar.draw();
    //drawToolTips();
};

/**************************************
 * Event handling
***************************************/

mousePressed = function() {
    myCurve.selectPoint();
    toolbar.mousePressed();
};

mouseReleased = function() {
    selectedPoint = false;
    toolbar.mouseReleased();
};

mouseDragged = function() {
    toolbar.mouseDragged();
    myCurve.mouseDrag();
};
