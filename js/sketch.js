var r, g, b;
var circleSize;

function setup() {

  var canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("canvasContainer");
  noSmooth();
  colorMode(RGB, 255, 255, 255);
  background(0);
  strokeWeight(2);
  angleMode(RADIANS);
  noLoop();

  r = random(50, 150);
  g = random(50, 150);
  b = random(50, 150);

  circleSize = windowHeight - 20;



}

//////////////////////////////////

function drawCurrentSegmentColor() {

  for (var i = 0; i < sequence.length; i++) {

    if (sequence[i].current) {
      var hue = map(sequence[i].centroid, 0, 3000, 0, 360);
      background(color(hue, 100, 100, 100));
      break;
    }

    else continue;
  }

}

//////////////////////////////////

function drawSequence() {

  var rectWidth = windowWidth / (sequence.length - 1);
  var rectHeight;

  for (var i = 0; i < sequence.length; i++) {

    var x = (i - 1) * rectWidth + (rectWidth / 2);
    var y = windowHeight / 2;
    var hue;

    hue = map(sequence[i].centroid, 0, 3000, 0, 360);
    rectHeight = map(sequence[i].rms, 0, 6, 0, windowHeight / 2);

    stroke(color(0, 0, 0, 25));
    fill(color(hue, 100, 100, 100));
    rect(x, y, rectWidth, rectHeight);

  }

}

//////////////////////////////////

function drawCursor(i) {

  var rectWidth = windowWidth / (sequence.length - 1);
  var rectHeight;


  if (i > 0) {

    var x = (i - 1) * rectWidth + (rectWidth / 2);
    var y = windowHeight / 2;
    var hue;

    hue = map(sequence[i - 1].centroid, 0, 3000, 0, 360);
    rectHeight = map(sequence[i - 1].rms, 0, 6, 0, windowHeight / 2);

    stroke(color(0, 0, 0, 25));
    fill(color(hue, 100, 100, 100));
    rect(x - rectWidth, y, rectWidth, rectHeight);

    hue = map(sequence[i].centroid, 0, 3000, 0, 360);
    rectHeight = map(sequence[i].rms, 0, 6, 0, windowHeight / 2);

    noStroke();
    fill(color(hue, 50, 100, 75));
    rect(x, y, rectWidth, rectHeight);

  }

}

//////////////////////////////////

function drawSpectrum(n) {

  background(0, 100, 100, 100);

  var img = createImage(64, 64);
  img.loadPixels();

  for (var i = 0; i < analyserL.frequencyBinCount; i++) {

    var hue;
    var rgbColor;
    hue = map(sequence[n].frequencyDomainData.L[i], 0, 255, 0, 1);

    rgbColor = hsvToRgb(hue, 1, 1);

    index = 2047 - i;
    img.pixels[index * 4] = rgbColor[0];
    img.pixels[index * 4 + 1] = rgbColor[1];
    img.pixels[index * 4 + 2] = rgbColor[2];
    img.pixels[index * 4 + 3] = 255;

    hue = map(sequence[n].frequencyDomainData.R[i], 0, 255, 0, 1);

    rgbColor = hsvToRgb(hue, 1, 1);

    index = 2048 + i;
    img.pixels[index * 4] = rgbColor[0];
    img.pixels[index * 4 + 1] = rgbColor[1];
    img.pixels[index * 4 + 2] = rgbColor[2];
    img.pixels[index * 4 + 3] = 255;

  }

  img.updatePixels();
  image(img, 0, 0, windowWidth, windowHeight);

}

function drawSound(segment) {

  translate(windowWidth / 2, windowHeight / 2);
  background(0);
  stroke(255);
  beginShape();
  for (var i = 0; i < segment.mfcc.length / 2; i++) {
    vertex(segment.mfcc[i], segment.mfcc[i + segment.mfcc.length / 2] );
  }
  endShape();
  translate(-windowWidth / 2, -windowHeight / 2);

}

//////////////////////////////////

function hsvToRgb(h, s, v) {
  var r, g, b;

  var i = Math.floor(h * 6);
  var f = h * 6 - i;
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  return [r * 255, g * 255, b * 255];
}

//////////////////////////////////


function drawSound(segment, mode) {

  noStroke();

  // for (var i = 0; i < data.length / 2; i++) {
  //
  //   var index = ((data.length / 2) - 1) - i;
  //   if (data[index] >= 0) {
  //     fill(100, 100, data[index] * 20);
  //     // fill(data[index] * 10);
  //   }
  //   else {
  //     fill(-data[index] * 20, 100, 100);
  //     // fill(-data[index] * 10);
  //   }
  //
  //   ellipse(windowWidth / 2, windowHeight / 2, index * 20, index * 20);
  // }


  // var img = createGraphics( ((data.length / 2) - 1) * 20, ((data.length / 2) - 1) * 20 );
  //
  // for (var i = 0; i < data.length / 2; i++) {
  //
  //   var index = ((data.length / 2) - 1) - i;
  //   if (data[index] >= 0) {
  //     fill(100, 100, data[index] * 20);
  //     // fill(data[index] * 10);
  //   }
  //   else {
  //     fill(-data[index] * 20, 100, 100);
  //     // fill(-data[index] * 10);
  //   }
  //
  //   img.ellipse(windowWidth / 2, windowHeight / 2, index * 20, index * 20);
  //
  // }
  //
  // mk = createGraphics(width, height);
  //
  // var start = 0;
  // var end = (2 * PI) / sequence.length;
  //
  // arc( windowWidth / 2, windowHeight / 2, (data.length / 2) - 1, (data.length / 2) - 1, start, end, PIE);
  //
  // var masked;
  // ( masked = img.get() ).mask( mk.get() );
  //
  // rotate(n * end);
  //
  // image(masked, windowWidth / 2, windowHeight / 2);

  switch (mode) {

    case 'mfcc':

    var data = segment.mfcc;

    var start = 0;
    var end = (2 * PI) / sequence.length;

    push();

    translate(windowWidth / 2, windowHeight / 2);

    rotate(n * end);

    for (var i = 0; i < data.length / 2; i++) {

      var index = ((data.length / 2) - 1) - i;
      if (data[index] >= 0) {
        fill(r, g, data[index] * 20);
        // fill(data[index] * 10);
      }
      else {
        fill(-data[index] * 20, g, b);
        // fill(-data[index] * 10);
      }

      var arcSize = circleSize / (data.length / 2);
      arc(0, 0, index * arcSize, index * arcSize, start, end, PIE);

    }

    pop();

    break;

    //////////////////////////////////

    case 'spectrum':

    var data = segment.frequencyDomainData.L;

    var start = 0;
    var end = (2 * PI) / sequence.length;

    push();

    translate(windowWidth / 2, windowHeight / 2);

    rotate(n * end);

    var increment = int(data.length / 100);

    for (var i = 0; i < data.length; i+=increment) {

      var index = ((data.length) - 1) - i;

      fill(0, data[index] * 40, data[index] * 40);

      var arcSize = int(circleSize / 100);

      arc(0, 0, (index / increment) * arcSize, (index / increment) * arcSize, start, end, PIE);

    }

    pop();

    break;

    default:

  }

}
