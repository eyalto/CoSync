
var stage;
var canvas_fg;
var canvas_bg;
var fg_ctx;
var bg_ctx;
var sprite_fg;
var sprite_bg;
var play_btn;
var width;
var height;
var frame_duration = 10;
var max_offset = 76;
var steps =   Math.floor(max_offset /2); // <== speedup //max_offset; // slow 
var blend_steps =  steps; //Math.floor(steps/2);
var x_offset = Math.floor(max_offset/2);
var diff_angle = 18;
var blend_angle = Math.floor(diff_angle/2);
var currentImage = 0;
var blending = false;
var blendComplete;
var viewClicked;
var cameraRoll;
var cameraRollSprite;
var stopBlendingIndex = -1;

function setupStage(stg_width,stg_height,completed, clicked){
    stage = Sprite3D.stage();
	width = stg_width;
	height = stg_height;
	canvas_fg = document.getElementById("layer2")
	canvas_fg.width = width;
	canvas_fg.height = height;
	canvas_bg = document.getElementById("layer1");
	canvas_bg.width = width;
	canvas_bg.height = height;
	sprite_fg = Sprite3D.create(canvas_fg);
	sprite_bg = Sprite3D.create(canvas_bg);
	var btn = document.getElementById("overplay");
	play_btn = Sprite3D.create(btn);
	stage.appendChild(play_btn);
	stage.appendChild(sprite_fg);
	stage.appendChild(sprite_bg);
	sprite_fg.origin(width/2,height/2,0);
	sprite_bg.origin(width/2,height/2,0);
	play_btn.origin(btn.width/2,btn.height/2);
	sprite_fg.update();
	sprite_bg.update();
	play_btn.update();
	// 
	fg_ctx = canvas_fg.getContext('2d');
	blendComplete = completed;
	viewClicked = clicked;
	//
	sprite_fg.addEventListener('click',clicked,false);
	sprite_bg.addEventListener('click',clicked,false);
	play_btn.addEventListener('click',clicked,false);
	// initialize camera roll container
	cameraRoll = document.getElementById('cameraroll');
	cameraRollSprite = Sprite3D.create(cameraRoll);
	cameraRollSprite.origin(0,0);
	cameraRollSprite.position(-width/2,height/2,3);
	cameraRollSprite.css('visibility','hidden');
	cameraRollSprite.update();
	stage.appendChild(cameraRollSprite);
}


function showCameraRoll(frames){
	cameraRollSprite.position(-width/2,(height/2)-frames[0].height);
	cameraRollSprite.css('visibility','visible');
	for (var i = 0; i < frames.length; i++) {
		cameraRoll.appendChild(frames[i]);
	};
	cameraRollSprite.update();

}

function hideCameraRoll(){
	cameraRollSprite.css('visibility','hidden');
	cameraRoll.innerHTML = '';
	cameraRollSprite.update();
}

function setBledListener(callback){
	blendCallback = callback;
}

function startBlendingRight(img_index){
	blending = true;
	blend(img_index);
}

function startBlendingLeft(img_index){
	blending = true;
	blend_left(img_index);
}

function stopBlending(){
	blending = false;
}

function isBlending(){
	return blending;
}

function stopBlendingAt(index){
	console.log("exit blending requested at frame # ",index);
	stopBlendingIndex = index;
}

function drawVideo(currVideo){
	if (currVideo.paused || currVideo.ended) return false;
	fg_ctx.drawImage(currVideo,0,0,width,height);
	setTimeout(drawVideo,20,currVideo);
}

function drawOneFrame(currVideo){
	fg_ctx.drawImage(currVideo,0,0,width,height);	
}

function showPlay(){
	play_btn.css('visibility','visible');
	play_btn.update();
}

function hidePlay(){
	play_btn.css('visibility','hidden');
	play_btn.update();
}

//
// blend / blend_in / blend_out - right side blending
//
function blend(img_index) {
	// check exit conditions
	// stopBledingIndex or last blending frame was reached so finish blending
	if (img_index == stopBlendingIndex || !blending || img_index == blendFrames.length -1){
		stopBlendingIndex = -1;
		sprite_fg.rotationY(0);
		sprite_bg.rotationY(0);
		fg_ctx.drawImage(blendFrames[img_index],0,0);
		sprite_fg.css('opacity',1.0);
		sprite_bg.css('opacity',0.0);
		sprite_bg.update();
		sprite_fg.update();
		blending = false; //normal case of finishing the fames to blend
		blendComplete(img_index);
	}
	else if (img_index<blendFrames.length -1) {
		bg_ctx = canvas_bg.getContext('2d');
		fg_ctx = canvas_fg.getContext('2d');
		sprite_fg.rotationY(0);
		sprite_fg.update();
		fg_ctx.drawImage(blendFrames[img_index],0,0);
		fg_ctx.fillStyle ="#000000";
		sprite_fg.css('opacity',1.0);
		sprite_bg.css('opacity',0.0);
		bg_ctx.fillStyle ="#000000";
		bg_ctx.fillRect(0.0,max_offset,canvas_bg.height);
		bg_ctx.drawImage(blendFrames[img_index+1],max_offset,0);
		currentImage = img_index;
		console.log("going to blend in..");
		setTimeout(function(){blend_in(0)},frame_duration);          
	}

}
//
// 
function blend_in(i) {
	var angle = (blend_angle/steps)*i;
	var move_x = (x_offset/steps)*i;
	// move in x offset
	fg_ctx.drawImage(blendFrames[currentImage],-move_x,0);
	bg_ctx.fillRect(0,0,canvas_bg.width,canvas_bg.height);
	bg_ctx.drawImage(blendFrames[currentImage+1],max_offset-move_x,0);
	// rotate
	sprite_fg.rotationY(angle);
	sprite_bg.rotationY(-diff_angle+angle);
	// blend
	if (i+blend_steps > steps) {
	  var alpha = (1 / blend_steps)*(i+blend_steps-steps);
	  sprite_fg.css('opacity',1-alpha);
	  sprite_bg.css('opacity',alpha);
	}
	// update
	sprite_fg.update();
	sprite_bg.update();
	//
	if(i < steps){
	  setTimeout(function(){blend_in((i+1))},frame_duration);
	}
	else{
	  console.log("going to blend out..");
	  setTimeout(function(){blend_out(0)},frame_duration);
	}        
}

function blend_out(i) {
	var angle = blend_angle - (blend_angle/steps)*i;
	var move_x = x_offset - (x_offset/steps)*i;
	// rotate
	sprite_bg.rotationY(-angle);
	// move
	bg_ctx.drawImage(blendFrames[currentImage+1],move_x,0);
	// update
	sprite_bg.update();

	if(i<steps){
	  setTimeout(function(){blend_out(i+1)},frame_duration);
	}
	else {
	  console.log("going to switchImage = "+currentImage);
	  setTimeout(function(){blend(currentImage+1)},frame_duration);
	}
}

//
function blend_left(img_index) {
	// check exit conditions
	// stopBledingIndex or last blending frame was reached so finish blending
	if (img_index == stopBlendingIndex || !blending || img_index == 0){
		stopBlendingIndex = -1;
		sprite_fg.rotationY(0);
		sprite_bg.rotationY(0);
		fg_ctx.drawImage(blendFrames[img_index],0,0);
		sprite_fg.css('opacity',1.0);
		sprite_bg.css('opacity',0.0);
		sprite_bg.update();
		sprite_fg.update();
		blending = false; //normal case of finishing the fames to blend
		blendComplete(img_index);
	}
	else if (img_index>0) {
		bg_ctx = canvas_bg.getContext('2d');
		fg_ctx = canvas_fg.getContext('2d');
		sprite_fg.rotationY(0);
		sprite_fg.update();
		fg_ctx.drawImage(blendFrames[img_index],0,0);
		fg_ctx.fillStyle ="#000000";
		sprite_fg.css('opacity',1.0);
		sprite_bg.css('opacity',0.0);
		bg_ctx.fillStyle ="#000000";
		bg_ctx.fillRect(0.0,max_offset,canvas_bg.height);
		bg_ctx.drawImage(blendFrames[img_index-1],max_offset,0);
		currentImage = img_index;
		console.log("going to blend in..");
		setTimeout(function(){blend_left_in(0)},frame_duration);          
	}

}
//
// 
function blend_left_in(i) {
	var angle = (blend_angle/steps)*i;
	var move_x = (x_offset/steps)*i;
	// move in x offset
	fg_ctx.drawImage(blendFrames[currentImage],move_x,0);
	bg_ctx.fillRect(0,0,canvas_bg.width,canvas_bg.height);
	bg_ctx.drawImage(blendFrames[currentImage-1],-max_offset+move_x,0);
	// rotate
	sprite_bg.rotationY(diff_angle-angle);
	sprite_fg.rotationY(-angle);
	// blend
	if (i+blend_steps > steps) {
	  var alpha = (1 / blend_steps)*(i+blend_steps-steps);
	  sprite_fg.css('opacity',1-alpha);
	  sprite_bg.css('opacity',alpha);
	}
	// update
	sprite_fg.update();
	sprite_bg.update();
	//
	if(i < steps){
	  setTimeout(function(){blend_left_in((i+1))},frame_duration);
	}
	else{
	  console.log("going to blend out..");
	  setTimeout(function(){blend_left_out(0)},frame_duration);
	}        
}

function blend_left_out(i) {
	var angle = blend_angle - (blend_angle/steps)*i;
	//var move_x = (x_offset/steps)*i;
	var move_x = -x_offset + (x_offset/steps)*i;
	// rotate
	sprite_bg.rotationY(angle);
	// move
	bg_ctx.drawImage(blendFrames[currentImage-1],move_x,0);
	// update
	sprite_bg.update();

	if(i<steps){
	  setTimeout(function(){blend_left_out(i+1)},frame_duration);
	}
	else {
	  console.log("going to switchImage = "+currentImage);
	  setTimeout(function(){blend_left(currentImage-1)},frame_duration);
	}
}