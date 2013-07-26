/*

changes 

AUG 10 2012
-Bug fix: removed unnecessary Math.round() causing Safari to seek to wrong frames
-Patch:   added newPos = newPos + 0.00001 to correct for Safari seeking to correct frame. ie when setting myVideo.currentTime to 0.04 Safari *should* seek to SMPTE 00:00:00:01 but instead remains stuck at 00:00:00:00
          seeking to 0.40001 forces Safari to seek to SMPTE 00:00:00:01. Also this trick works fine in Chrome, so solution pratically found.

*/

var updateVideoCurrentTimeCodeInterval;
var FPS = 30;
var WIDTH = 1280;
var HEIGHT = 720;
var loadedmetadata = false;
var updateReadyStateInterval;
var readyState;
var video;
var duration;
var seekCounter=0;
var isDebug = true;
var videos = new Array();
var currVideoIndex = 0;
var blendFrames = new Array();
var cameraFrames = new Array();
var videonames = new Array(); 
var videoEndMillies = new Array();

$(document).ready(function() {
	preloader();
});

function preloader(){
	setupVideos(init);
	//setupImages();
}

function init() {
	setupStage(WIDTH,HEIGHT,blendComplete,viewClicked);
	setupGlue();
}

function setupVideos(done){
	$.getJSON('videos.json',function(data){
	  	for (var i=0; i < data.length; i++){
			videonames.push(data[i]);
			var millies = parseInt(data[i].replace(i+"_",'').replace(".webm",''),10);
			videoEndMillies.push(millies);
		}
		if (typeof done != "undefined" && typeof done != null)
			done();
	});
}

function setupGlue() {
	//video = $('video')[0];
	video = document.createElement('video'); //off-screen video
	currVideoIndex = 0;
	video.src = videonames[currVideoIndex];
	video.width = WIDTH;
	video.height = HEIGHT;
	videos[currVideoIndex] = video;
	blendFrames.length = videonames.length;
	cameraFrames.length = blendFrames.length;
	// seek to first frame and draw it
	initLoadListeners( seekAndDrawPoster );
	initEventListeners();
	
}

function seekAndDrawPoster() {
	video.addEventListener('seeked', function (currVideo){ 
		return function(event) { 
			drawOneFrame(currVideo);
			event.currentTarget.removeEventListener('seeked',this,false);
		};}(video));
	seekVideoToTimecode(video,"00:00:00:10",FPS);	
}

function viewClicked(event){
	
	console.log("view clicked object id = "+event.currentTarget.id);


	if (isBlending()){
		stopBlending();
	}
	else
		togglePlay();
}

function updateReadyState() {

	var HAVE_NOTHING = 0;
	var HAVE_METADATA = 1;
	var HAVE_CURRENT_DATA = 2;
	var HAVE_FUTURE_DATA = 3;
	var HAVE_ENOUGH_DATA = 4;

	if (video.readyState == HAVE_NOTHING) {
		$("#metaData").html("video.readyState = HAVE_NOTHING");
	} else if (video.readyState > HAVE_NOTHING) {

		var readyStateInfo = "<b>Meta data loaded</b><br/>";
		readyStateInfo += "duration: " + parseFloat(video.duration.toFixed(2))
		+ " seconds.<br/>";
		$("#metaData").html(readyStateInfo);
	}

}

function initLoadListeners(done) {
	video.addEventListener("loadedmetadata", onLoadedMetaData, false); // does not fire on WebKit nightly
	video.addEventListener("loadeddata", function (callback) {
		return function() { 
			onLoadedData();
			done();
		}
	}(done), false);
}

function initEventListeners() {
	video.addEventListener("play", onPlay, false);
	video.addEventListener("pause",onPause, false);
	video.addEventListener("ended",onEnd, false);
	
}

function onLoadedMetaData() {
	// duration is available
	console.log("Meta data loaded...");
}

function onLoadedData() {
	console.log("Data loaded...");
}

function onTimeUpdate() {
	//	updateVideoCurrentTimeCode();
	// works fine in all browsers, but it's a tad slow- still using a setinterval to make it update faster
}

function onEnd(){
	currVideoIndex = 0;
	video = videos[currVideoIndex];
	seekAndDrawPoster();
	initEventListeners();
	showPlay();
}

function onPlay() {
	// transition and than play....
	drawVideo(video);
}

function onPause() {
	// check
	if (video.ended) {
		return;
	}

	var delta_time = video.duration - video.currentTime;	
	var curr_frame = secondsToTimecode(video.currentTime,FPS);
	console.log("paused current frame = "+curr_frame+" delta time = "+delta_time);

	// loop to create video frames	
	for (var i=0; i<6; i++){
		videos[i] = document.createElement('video');
		videos[i].src = videonames[i];
		videos[i].width = video.width;
		videos[i].height = video.height;
		videos[i].addEventListener("loadedmetadata", function (j){ 
			return function (event){
				metaLoaded(j);
				event.currentTarget.removeEventListener("loadedmetadata",this,false);
			}; }(i), false);
		videos[i].addEventListener("loadeddata", function (j,dtime){ 
			return function (event){
				dataLoaded(j, dtime);
				event.currentTarget.removeEventListener("loadeddata",this,false);
			}; }(i,delta_time), false);
		videos[i].pause();
		videos[i].load();
	}

}

function metaLoaded(index){
	console.log("loaded meta for "+index);
	console.log("video #"+index+" duration = "+videos[index].duration);
}

function dataLoaded(index,ref_frame_delta){
	//var endtime_delta = ( videoEndMillies[currVideoIndex] - videoEndMillies[index] ) / 1000.0;
	var endtime_delta = (videoEndMillies[index] - videoEndMillies[currVideoIndex]) / 1000.0;
	//var endtime_delta = 0;
	var frame_time = videos[index].duration - (ref_frame_delta + endtime_delta );
	var seek_to_frame = secondsToTimecode(frame_time,FPS);
	
	console.log("video #"+index+" should be seeking to frame "+seek_to_frame);

	videos[index].addEventListener('seeked', function (j){ 
		return function(event) { 
			seeked(j);
			event.currentTarget.removeEventListener('seeked',this,false);
		};}(index));
	seekVideoToTimecode(videos[index],seek_to_frame,FPS);
}

function seeked(index) {
	console.log("video #"+index+" seek is done ");

	var imgwidth = videos[index].width;
	var imgheight = videos[index].height;

	blendFrames[index] = document.createElement('canvas');
	blendFrames[index].width = imgwidth;
	blendFrames[index].height = imgheight;
	blendFrames[index].getContext('2d').drawImage(videos[index],0,0,blendFrames[index].width,blendFrames[index].height);
	
	if (isDebug){
		// append it to the container
		var smallframe = document.createElement('canvas');
		var small_width = Math.floor(imgwidth / videos.length);
		var small_height = Math.floor(imgheight / videos.length);
		smallframe.width = small_width;
		smallframe.height = small_height;
		smallframe.style.left = small_width * index;
		smallframe.style.position = 'absolute';
		smallframe.getContext('2d').drawImage(videos[index],0,0,smallframe.width,smallframe.height);
		smallframe.addEventListener('click', function(j) {
			return function(event) {
				stopBlendingAt(j);
			};}(index));
		cameraFrames[index]=smallframe;
	}

	seekCounter+=1;
	// all video are seeked and blendFrames are ready to blend
	if(seekCounter == videonames.length){
		seekCounter = 0;
		if (isDebug){
			showCameraRoll(cameraFrames);
		}
		if (currVideoIndex < 3){
			startBlendingRight(currVideoIndex);
		}
		else {
			startBlendingLeft(currVideoIndex);
		}
		
	}

}

function frameClicked(index){
	console.log("camera roll frame clicked # ",index);
}

function blendComplete(index){
	video = videos[index];
	currVideoIndex = index;
	initEventListeners();
	hideCameraRoll();
	video.play();
}
	
function updateVideoCurrentTimeCode() {

	var fixedTimecode = video.currentTime;
	fixedTimecode = parseFloat(fixedTimecode.toFixed(2));

	var SMPTE_time = secondsToTimecode(video.currentTime, FPS);
	$("#currentTimeCode").html(SMPTE_time);
}

function seekVideoToTimecode(videoObj, hh_mm_ss_ff, fps) {

	if (videoObj.paused == false) {
		videoObj.pause();
	}

	var seekTime = timecodeToSeconds(hh_mm_ss_ff, fps);
	var str_seekInfo = "video was at: " + videoObj.currentTime + " seeking to: " + seekTime;
	console.log(str_seekInfo);
	videoObj.currentTime = seekTime;
	str_seekInfo += " seek done, got: " + videoObj.currentTime ;
	console.log(str_seekInfo);
}




function goToTimecode() {
	var timecode = $('#timecode_txt').val();
	seekToTimecode(timecode,FPS);
}

function seekToTimecode(hh_mm_ss_ff, fps) {

	if (video.paused == false) {
		video.pause();
	}

	var seekTime = timecodeToSeconds(hh_mm_ss_ff, fps);
	var str_seekInfo = "video was at: " + video.currentTime + "<br/>";
	str_seekInfo += "seeking to (fixed): <b>" + seekTime + "</b><br/>";
	video.currentTime = seekTime;
	str_seekInfo += "seek done, got: " + video.currentTime + "<br/>";
	$("#seekInfo").html(str_seekInfo);

}

function togglePlay() {
	if (video.paused){
		hidePlay();
		video.play();
	}
	else {
		video.pause();
	}
}

var clickCounter = 0;

function seekFrames(nr_of_frames, fps) {

	clickCounter++;

	var div_seekInfo = document.getElementById('seekInfo');

	if (video.paused == false) {
		video.pause();
	}

	//var currentFrames = Math.round(video.currentTime * fps); 
	
	var currentFrames = video.currentTime * fps;
	
	var newPos = (currentFrames + nr_of_frames) / fps;
	newPos = newPos + 0.00001; // FIXES A SAFARI SEEK ISSUE. myVdieo.currentTime = 0.04 would give SMPTE 00:00:00:00 wheras it should give 00:00:00:01

	//var newPos = video.currentTime += 1/fps;
	//newPos = Math.round(newPos, 2) + 1/fps; 

	var str_seekInfo = "seeking to (fixed): <b>" + newPos + "</b><br/>";
	
	console.log("video.currentTime = " + newPos);
	video.currentTime = newPos; // TELL THE PLAYER TO GO HERE
	
	str_seekInfo += "seek done, got: " + video.currentTime + "<br/>";
	var seek_error = newPos - video.currentTime;
	str_seekInfo += "seek error: " + seek_error + "<br/>";

	div_seekInfo.innerHTML = str_seekInfo;
	
	// track calculated value in logger
	
	//console.log("SMPTE_time: " + SMPTE_time);
	
	
	// check found timecode frame
	var found_frame = $("#currentTimeCode").text();
	found_frame_split = found_frame.split(":");
	
	found_frame_nr = Number(found_frame_split[3]);
	
	//console.log("found_frame_nr: " + found_frame_nr + " (found_frame: "+found_frame+")");
	
	var fontColor = "#000";
	if ( found_frame_nr+1 != clickCounter) {
		fontColor = "#F00";	
	}
	
	$('#timecode_tracker').append("<font color='"+fontColor+"'>" + clickCounter + ";" + newPos + ';' + video.currentTime + ';'+found_frame+'</font><br/>');
	


}

function getDigits(val) {
	var fullVal = parseFloat(val);
	var newVal = fullVal - Math.floor(parseFloat(fullVal));
	newVal = newVal.toFixed(2);
	return newVal;
}

//SMTE Time-code calculation functions
//=======================================================================================================

function timecodeToSeconds(hh_mm_ss_ff, fps) {
	var tc_array = hh_mm_ss_ff.split(":");
	var tc_hh = parseInt(tc_array[0],10);
	var tc_mm = parseInt(tc_array[1],10);
	var tc_ss = parseInt(tc_array[2],10);
	var tc_ff = parseInt(tc_array[3],10);
	var tc_in_seconds = ( tc_hh * 3600 ) + ( tc_mm * 60 ) + tc_ss + ( tc_ff / fps );
	return tc_in_seconds;

}

function secondsToTimecode(time, fps) {
	
	var hours = Math.floor(time / 3600) % 24;
	var minutes = Math.floor(time / 60) % 60;
	var seconds = Math.floor(time % 60);
	var frames = Math.floor(((time % 1)*fps).toFixed(3));
	
	var result = (hours < 10 ? "0" + hours : hours) + ":"
	+ (minutes < 10 ? "0" + minutes : minutes) + ":"
	+ (seconds < 10 ? "0" + seconds : seconds) + ":"
	+ (frames < 10 ? "0" + frames : frames);

	return result;

}

