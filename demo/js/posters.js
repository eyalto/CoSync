var THUMBS_WIDTH = 240;
var THUMBS_HEIGHT = 180;
var FPS = 30;
var videodirs = new Array();

$(document).ready(function() {
	preloader();
});

function preloader(){
	$.getJSON('video_dirs.json',function(data){
		if (data.length != videodirs.length) {
  			for (var i=0; i < data.length; i++){
				videodirs.push(data[i]);
				loadPosterSrc(data[i]);
			}					
		}
	});
}

function loadPosterSrc(path){

	$.getJSON(path+'/videos.json',function(data){
			var videofile = data[0];
			var video = document.createElement('video');
			video.width = THUMBS_WIDTH;
			video.height = THUMBS_HEIGHT;
			video.src = path+'/'+videofile; 
			console.log('about to load video = ',video.src, ' path is ',path);
			loadPoster(video, path, videofile);
	});

}

function loadPoster(videoObj, path, videofile) {

	videoObj.addEventListener("loadeddata", function (currVideo,path) {
			return function() { 
				console.log('about to draw poster for '+currVideo.src);
				seekAndDrawPoster(currVideo,path)
			}
		}(videoObj,path), false);
	// load the videos with slight delay
	setTimeout(function(){videoObj.load();},25);
	
}

function seekAndDrawPoster(videoObj,path) {
	videoObj.addEventListener('seeked', function (currVideo, path){ 
		return function(event) { 
			var canvas = document.createElement('canvas');
			var link = document.createElement('a');
			link.href = path+'/video.html';
			canvas.width = currVideo.width;
			canvas.height = currVideo.height;
			canvas.getContext('2d').drawImage(currVideo,0,0,canvas.width,canvas.height);
			console.log('about to append poster in page '+currVideo.src + ' linked to '+canvas.innerHTML);
			link.appendChild(canvas);
			document.getElementById('posters').appendChild(link);
			event.currentTarget.removeEventListener('seeked',this,false);
		};}(videoObj,path));
	seekVideoToTimecode(videoObj,"00:00:00:10",FPS);	
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

function timecodeToSeconds(hh_mm_ss_ff, fps) {
	var tc_array = hh_mm_ss_ff.split(":");
	var tc_hh = parseInt(tc_array[0],10);
	var tc_mm = parseInt(tc_array[1],10);
	var tc_ss = parseInt(tc_array[2],10);
	var tc_ff = parseInt(tc_array[3],10);
	var tc_in_seconds = ( tc_hh * 3600 ) + ( tc_mm * 60 ) + tc_ss + ( tc_ff / fps );
	return tc_in_seconds;

}