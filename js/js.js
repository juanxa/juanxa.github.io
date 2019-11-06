
var body = document.querySelector("body");
var audio = document.querySelector("#audio");
var button_start_audio = document.querySelector("#button_start_audio");
var button_stop_audio = document.querySelector("#button_stop_audio");
var button_start_sequence = document.querySelector("#button_start_sequence");
var button_stop_sequence = document.querySelector("#button_stop_sequence");
var button_clear_sequence = document.querySelector("#button_clear_sequence");
var button_mode_next = document.querySelector("#button_mode_next");
var button_mode_mid = document.querySelector("#button_mode_mid");
var button_mode_remove_similar = document.querySelector("#button_mode_remove_similar");
var button_mode_remove_different = document.querySelector("#button_mode_remove_different");
var button_mode_time = document.querySelector("#button_mode_time");
var button_change_source = document.querySelector("#button_change_source");
var button_draw_mode = document.querySelector("#button_draw_mode");

var audioContext = new AudioContext();
var source = audioContext.createMediaElementSource(audio);
var analyserL = audioContext.createAnalyser();
var analyserR = audioContext.createAnalyser();
var splitter = audioContext.createChannelSplitter(2);

source.connect(splitter);
splitter.connect(analyserL, 0, 0);
splitter.connect(analyserR, 1, 0);

sourceIndex = 0;
audio.src = sources[sourceIndex];

var fftSize = 4096;
// var fftSize = 2048;

var sequence = [];
var envelope = [];
var timeIntervals = [];
var angles = [];

var metric = "euclidean";
// var metric = "cosine";

var order_mode = "next";

var time_mode = false;

var average = 0;
var averageCount = 1;

var movingAverageValues = [];

var threshold = 0;

var started = false;

var n = 0;

var drawMode = "sequence";

init();

//////////////////////////////////

function init() {

  initAnalyzer();
  initSequence();
  createEnvelope();

}

//////////////////////////////////

function initAnalyzer() {

  analyserL.fftSize = fftSize;
  analyserL.smoothingTimeConstant = 0;
  analyserR.fftSize = fftSize;
  analyserR.smoothingTimeConstant = 0;

  Meyda.bufferSize = fftSize;
  Meyda.numberOfMFCCCoefficients = 20;

}

//////////////////////////////////

function initSequence() {

  sequence.length = 0;

}

//////////////////////////////////

function createEnvelope () {

  envelope.length = 0;

  for (var i = analyserL.fftSize; i > 0; i--) {
    value = (analyserL.fftSize / 2) - Math.abs(i - (analyserL.fftSize / 2));
    value = Math.min(1, value /= 10);
    envelope.push(value);

  }
}

//////////////////////////////////

function run() {

  var segment = getSegment();
  placeSegmentInSequence(segment);
  playSequence();

}

//////////////////////////////////

function getSegment() {

  var timeDomainDataL = new Float32Array(analyserL.fftSize);
  var timeDomainDataR = new Float32Array(analyserR.fftSize);

  analyserL.getFloatTimeDomainData(timeDomainDataL);
  analyserR.getFloatTimeDomainData(timeDomainDataR);

  var frequencyDomainDataL = Meyda.extract('powerSpectrum', timeDomainDataL);
  var frequencyDomainDataR = Meyda.extract('powerSpectrum', timeDomainDataR);

  // var frequencyDomainDataL = Meyda.extract('amplitudeSpectrum', timeDomainDataL);
  // var frequencyDomainDataR = Meyda.extract('amplitudeSpectrum', timeDomainDataR);

  var mfccL = Meyda.extract('mfcc', frequencyDomainDataL);
  var mfccR = Meyda.extract('mfcc', frequencyDomainDataR);

  var mfcc = mfccL.concat(mfccR);

  var centroid = getCentroid(frequencyDomainDataL, frequencyDomainDataR);
  var rms = getRMS(timeDomainDataL, timeDomainDataR);

  var segment = createSegment(timeDomainDataL, timeDomainDataR, frequencyDomainDataL, frequencyDomainDataR, mfcc, centroid, rms);

  return segment;

}

//////////////////////////////////

function createSegment(timeDomainDataL, timeDomainDataR, frequencyDomainDataL, frequencyDomainDataR, mfcc, centroid, rms) {

  var segment = {
    "timeDomainData": { "L": timeDomainDataL, "R": timeDomainDataR },
    "frequencyDomainData": { "L": frequencyDomainDataL, "R": frequencyDomainDataR },
    "mfcc": mfcc,
    "centroid": centroid,
    "rms": rms,
    "current": ""
  }

  return segment;

}

//////////////////////////////////

function placeSegmentInSequence(segment) {

  if (sequence.length < 2) {
    sequence.push(segment);
  }
  else {

    switch(order_mode) {

      //////////////////////////////////

      case "next":

      var distances = getDistances(segment, sequence);
      var index = getIndexofMinDistance(distances);

      sequence.splice(index + 1, 0, segment);

      updateThreshold(distances, index);
      getAngles();
      getTimeIntervals();

      break;

      //////////////////////////////////

      case "mid":

      var midpoints = getMidpoints(sequence);
      var distancesToMidpoints = getDistances(segment, midpoints);
      var distances = getDistances(segment, sequence);

      var sum = new Array(midpoints.length);

      for (var i = 0; i < sum.length; i++) {
        sum[i] = distancesToMidpoints[i] + distances[i] + distances[i + 1];
      }

      var index = getIndexofMinDistance(sum);

      sequence.splice(index + 1, 0, segment);

      updateThreshold( distances, getIndexofMinDistance(distances) );
      getTimeIntervals();

      break;


      //////////////////////////////////

      case "remove_similar":

      var distances = getDistances(segment, sequence);
      var index = getIndexofMinDistance(distances);

      if (distances[index] < threshold) {
        sequence.splice(index, 1);
        console.log("removed " + index);
      }
      else {
        sequence.splice(index + 1, 0, segment);
      }

      updateThreshold(distances, index);
      getTimeIntervals();

      break;

      //////////////////////////////////

      case "remove_different":

      var distances = getDistances(segment, sequence);
      var index = getIndexofMinDistance(distances);

      updateThreshold(distances, index);


      var indexMax = getIndexofMaxDistance(distances);

      if (distances[index] < threshold) {
        sequence.splice(index + 1, 0, segment);
        sequence.splice(indexMax, 1);
        console.log("removed " + indexMax);
      }
      else {
        sequence.splice(index + 1, 0, segment);
      }

      updateThreshold(distances, index);
      getTimeIntervals();

      break;

      //////////////////////////////////

      default:

    }

  }

}

//////////////////////////////////

function getCentroid(data1, data2) {

  var binFrequency = (audioContext.sampleRate / 2) / analyserL.frequencyBinCount;
  var a = 0;
  var b = 0;

  for (var i = 0; i < data1.length; i++) {
    var average = (data1[i] + data2[i]) / 2;
    a += i * binFrequency * average;
    b += average;
  }

  if (b == 0) {
    // console.log(0);
    return 0;
  }
  else {
    // console.log(a / b);
    return a / b;
  }

}

//////////////////////////////////

function getRMS(data1, data2) {

  var sum = 0;

  for (var i = 0; i < data1.length; i++ ) {
    var average = (data1[i] + data2[i]) / 2;
    sum += Math.pow(average, 2);
  }

  return Math.sqrt(sum);

}

function distance(obj1, obj2) {

  var distance;

  if (metric == "euclidean") {
    distance = euclideanDistance(obj1, obj2);
  }

  if (metric == "cosine") {
    distance = cosineDissimilarity(obj1, obj2);
  }

  return distance;

}

//////////////////////////////////

function euclideanDistance(obj1, obj2) {

  var difference = 0;
  var square = 0;
  var sum = 0;

  for (var i = 0; i < obj1.length; i++) {
    difference = obj1[i] - obj2[i];
    square = difference * difference;
    sum += square;
  }

  return Math.sqrt(sum);

}

//////////////////////////////////

function cosineDissimilarity(obj1, obj2) {

  var dot = 0;
  var normA = 0;
  var normB = 0;

  for (var i = 0; i < obj1.length; i++) {
    dot += obj1[i] * obj2[i];
    normA += Math.pow( obj1[i], 2 );
    normB += Math.pow( obj2[i], 2 );
  }

  normA = Math.sqrt(mA);
  normB = Math.sqrt(mB);

  return 1 - ( dot / ( normA * normB ) );

}

//////////////////////////////////

function getAngle(obj1, obj2) {

  var dot = 0;
  var normA = 0;
  var normB = 0;

  for (var i = 0; i < obj1.length; i++) {
    dot += obj1[i] * obj2[i];
    normA += Math.pow( obj1[i], 2 );
    normB += Math.pow( obj2[i], 2 );
  }

  normA = Math.sqrt(mA);
  normB = Math.sqrt(mB);

  var radians = Math.acos( ( dot / ( normA * normB ) ) );
  return radians * (180 / Math.PI); // degrees

}

//////////////////////////////////

function getAngles() {

  angles = [];

  for (var i = 0; i < sequence.length - 1; i ++) {
    angles.push(getAngle(sequence[i].mfcc, sequence[i + 1].mfcc));
  }

  // console.log(angles);

  

}


//////////////////////////////////

function getDistances(segment, points) {

  var distances = new Array(points.length);

  for (var i = 0; i < distances.length; i++) {
    distances[i] = distance(segment.mfcc, points[i].mfcc);
  }

  return distances;

}

//////////////////////////////////

function getIndexofMinDistance(distances) {

  var index = 0;
  var minDistance = distances[index];

  for (var i = 0; i < distances.length; i++) {
    if (distances[i] < minDistance) {
      minDistance = distances[i];
      index = i;
    }
  }
  return index;

}

//////////////////////////////////

function getIndexofMaxDistance(distances) {

  var maxDistance = distances[0];
  var index = 0;

  for (var i = 0; i < distances.length; i++) {
    if (distances[i] > maxDistance) {
      maxDistance = distances[i];
      index = i;
    }
  }
  return index;

}

//////////////////////////////////

function getMidpoints(points) {

  var midpoints = new Array(points.length - 1);

  for (var i = 0; i < (midpoints.length); i++) {
      midpoints[i] = midpoint(points[i].frequencyDomainData, points[i + 1].frequencyDomainData);
  }

  return midpoints;

}

//////////////////////////////////

function midpoint(obj1, obj2) {

  var timeDomainDataL = new Float32Array(analyserL.fftSize);
  var timeDomainDataR = new Float32Array(analyserR.fftSize);

  for (var i = 0; i < analyserL.fftSize; i++) {
    timeDomainDataL[i] = (obj1.L[i] + obj2.L[i]) / 2;
  }

  for (var i = 0; i < analyserL.fftSize; i++) {
    timeDomainDataR[i] = (obj1.R[i] + obj2.R[i]) / 2;
  }

  var frequencyDomainDataL = Meyda.extract('powerSpectrum', timeDomainDataL);
  var frequencyDomainDataR = Meyda.extract('powerSpectrum', timeDomainDataR);

  var mfccL = Meyda.extract('mfcc', frequencyDomainDataL);
  var mfccR = Meyda.extract('mfcc', frequencyDomainDataR);

  var mfcc = mfccL.concat(mfccR);

  var midpoint = {
    "mfcc": mfcc,
  }

  return midpoint;

}

//////////////////////////////////

function getTimeIntervals() {

  timeIntervals.length = sequence.length;

  for (var i = 0; i < sequence.length; i++) {
    // console.log( i + " " + (i + 1) % sequence.length);
    // var interval = ( distance(sequence[i].mfcc, sequence[0].mfcc) / 500.0 ) * 1000;
    var interval = distance(sequence[i].mfcc, sequence[ (i + 1) % sequence.length ].mfcc);
    // var interval = (distance(sequence[i].mfcc, sequence[i + 1].mfcc));
    // console.log(interval);
    timeIntervals[i] = interval;

  }

  // console.log(timeIntervals);

}


//////////////////////////////////

function playSequence() {

  if (n < sequence.length) {
    playSegment(sequence[n]);
  }
  else {
    n = 0;
    run();
  }
}


//////////////////////////////////

function playSegment(segment) {

  if (drawMode == "sequence") {

    colorMode(HSB, 360, 100, 100, 100);
    background(0, 0, 0, 100);
    rectMode(CENTER);
    strokeWeight(2);

    drawCurrentSegmentColor();
    drawSequence();
    drawCursor(n);
  }

  if (drawMode == "circle") {
    colorMode(RGB, 255, 255, 255);
    drawSound(segment, "mfcc");
  }


  var buffer = audioContext.createBuffer(2, analyserL.fftSize, audioContext.sampleRate);
  var dataL = new Float32Array(analyserL.fftSize);
  var dataR = new Float32Array(analyserL.fftSize);

  for (var i = 0; i < analyserL.fftSize; i++) {
    dataL[i] = segment.timeDomainData.L[i] * envelope[i];
    dataR[i] = segment.timeDomainData.R[i] * envelope[i];
  }

  buffer.copyToChannel(dataL,0,0);
  buffer.copyToChannel(dataR,1,0);
  var bufferSource = audioContext.createBufferSource();
  bufferSource.buffer = buffer;
  bufferSource.connect(audioContext.destination);
  bufferSource.start();
  bufferSource.onended = function() {
    n++;
    if (time_mode) {
      setTimeout(playSequence, timeIntervals[n]);
      // console.log(n + " " + timeIntervals[n]);
    }
    else {
      playSequence();
    }
  };

}

//////////////////////////////////

function movingAverage(value, size) {

  if (movingAverageValues.length < size) {
    movingAverageValues.push(value);
  }
  else {
    movingAverageValues.push(value);
    movingAverageValues.shift();
  }

  var average = 0;
  for (var i = 0; i < movingAverageValues.length; i++) {
    average += movingAverageValues[i];
  }
  average /= movingAverageValues.length;

  return average;

}


//////////////////////////////////

function setOrderMode(selectedMode) {
  console.log(selectedMode);
  order_mode = selectedMode;

}

//////////////////////////////////

function toggleTimeMode() {
  if (time_mode) {
    time_mode = false;
  } else {
    time_mode = true;
  }
}

//////////////////////////////////

function updateThreshold(distances, index) {
  var minDistance = distances[index];
  threshold = movingAverage(minDistance, 30);
  // console.log("min distance " + minDistance + " threshold " + threshold);

}

//////////////////////////////////

function startAudio() {
  audio.play();

}

//////////////////////////////////

function stopAudio() {
  audio.pause();

}

//////////////////////////////////

function changeSource() {
  sourceIndex++;
  sourceIndex %= sources.length;
  audio.src = sources[sourceIndex];
  console.log(sources[sourceIndex]);
  audio.load();
  audio.play();


}

//////////////////////////////////

function toggleDrawMode() {

  background(0);

  if (drawMode == "sequence") {
    drawMode = "circle";
  } else {
    drawMode = "sequence";
  }

}

//////////////////////////////////

button_start_audio.addEventListener('click', startAudio);
button_stop_audio.addEventListener('click', stopAudio);
button_start_sequence.addEventListener('click', run);
button_stop_sequence.addEventListener('click', init); // fix
button_clear_sequence.addEventListener('click', init); // fix
button_mode_next.addEventListener('click', setOrderMode.bind(this, "next"));
button_mode_mid.addEventListener('click', setOrderMode.bind(this, "mid"));
button_mode_remove_similar.addEventListener('click', setOrderMode.bind(this, "remove_similar"));
button_mode_remove_different.addEventListener('click', setOrderMode.bind(this, "remove_different"));
button_mode_time.addEventListener('click', toggleTimeMode);
button_change_source.addEventListener('click', changeSource);
button_draw_mode.addEventListener('click', toggleDrawMode);
