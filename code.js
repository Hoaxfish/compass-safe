var canvas, ctx;

const backgroundColor = "#ffffff"; 
const startColor = "#000000"; 
const endColor = "#ff0000"; 

var bgArray = color2Array(backgroundColor);
var scArray = color2Array(startColor);
var ecArray = color2Array(endColor);

function color2Array(color) {
	return [
		parseInt(color.substring(1,3),16),
		parseInt(color.substring(3,5),16),
		parseInt(color.substring(5),16),
	];
}

//HTML enters here 
function startScript() {
	ctxIniPromise();
	drawOut(drawTiles());
}

function ctxIniPromise() { //initialise the canvas and ctx variables, async makes it into a Promise
	canvas = document.getElementById("myCanvas");
	ctx = canvas.getContext("2d");

	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawTiles(){
	let meshWidth = Math.round(canvas.width / 16); // 16 pixel width for cell images
	let meshHeight = Math.round(canvas.height / 16); // 16 pixel height for cell images

	let pixelMask = new Array(meshHeight * 16); // define pixelMask as a 2D array
	for (let i = 0; i < pixelMask.length; i++) {
		pixelMask[i] = new Array(meshWidth * 16);
	}

	let openPaths = 0; //calculated final value of NSEW, for current cell
	let meshArray = new Array(meshHeight); // first part of 2D array to store compass values
	for (let y = 0; y < meshHeight; y++) {
		meshArray[y] = new Array(meshWidth); //second dimension of array to store compass values
		for (let x = 0; x < meshWidth; x++) {
			openPaths = 0;
			//south path - random chance
			if (y < meshHeight - 1) { // if not last row
				if (randomInt(10) > 3) { openPaths += compass.s; }
			}
			//east path - random chance
			if (x < meshWidth - 1) { // if not last column
				if (randomInt(10) > 4) { openPaths += compass.e; }
			}
			//north path - check south
			if (y > 0) { // if not first row
				if (CheckBitState(meshArray[y-1][x], compass.s)) { openPaths += compass.n; }
			}
			//west path - check east
			if (x > 0) { // if not first column
				if (CheckBitState(meshArray[y][x-1], compass.e)) { openPaths += compass.w; }
			}
			meshArray[y][x] = openPaths;
			drawTile(pixelMask, x * 16, y * 16, openPaths);
		}
	}
	return pixelMask;
}

function randomInt(max) { return Math.floor(Math.random() * Math.floor(max)); }

function drawTile(pixelMask, x, y, direction){
	for (let dy = 0; dy < 16; dy++) {
		for (let dx = 0; dx < 16; dx++) {
			pixelMask[y + dy][x + dx] = tileArray[direction][dy][dx];
		}
	}
}

//make "mesh" 2D array, width and height / 16
//make "pixelMask" 2D array of total size width*height
//test each mesh-cell, to determine direction
//write matching pixels into "pixelMask" array

function drawOut(pixelMask){
	let canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	let pixelData = new Array(canvas.height);

	let inOut = []; //inOut is a Queue, push items to end, shift them from the front
	let value; // = 0;
	let dv = 1;

	// need to pre-define all rows as adjacency is not row-by-row
	for (let y = 0; y < pixelMask.length; y++) {
		pixelData[y] = new Array(canvas.width);
	}	

	for (let y = 0; y < pixelMask.length; y++) {
		for (let x = 0; x < pixelMask[y].length; x++) {

			if (pixelMask[y][x] != 1) {
				if (!pixelMask[y][x]) { //is 0
					drawPixelBack(canvasData, x, y); // if "gap" draw final pixel immediately
				}
				continue;
			} //jump this iteration if pixel is a gap, or visited?

			value = 0; 				//start new section at base value: 0;
			pixelData[y][x] = value;//immediately set pixel colour
			pixelMask[y][x] = 2;	//mark pixel as visited

			inOut = [new coords(x,y)]; //start the stack with the first pixel

			//let loopCount = 0 //safety cap to prevent infinite loop during dev
			//while (inOut.length > 0 && loopCount < 1024) { //test if inOut stack exhausted
			while (inOut.length > 0) { //test if inOut stack exhausted
				//loopCount++; //safety cap: +1 looped.

				let cx = inOut[0].x; //retrieve X and Y co-ords for adjcency tests from first element, from the start of the stack
				let cy = inOut[0].y;

				value = pixelData[cy][cx]; // get cell value
				if ((value + dv > 255) || (value + dv < 0)) { dv *= -1;}
				
				
				setCellValue(cx, cy, value);
				drawPixel(canvasData, cx, cy, value, value, value); // draw final pixel immediately
			
				//test "can I go here next?"
				if (canMoveTo (cx - 1, cy)){ //test west
					inOut.push(new coords(cx - 1, cy)); //push cell
					setCellValue(cx - 1, cy, value + dv); //set cell cx - 1: value, set "seen": temp
				}
				if (canMoveTo (cx + 1, cy)){ //test east
					inOut.push(new coords(cx + 1, cy)); //push cell
					setCellValue(cx + 1, cy, value + dv); //set cell cx + 1: value, set "seen": temp
				}
				if (canMoveTo (cx, cy - 1)){ //test north
					inOut.push(new coords(cx, cy - 1)); //push cell
					setCellValue(cx, cy - 1, value + dv); //set cell cy - 1: value, set "seen": temp
				}
				if (canMoveTo (cx, cy + 1)){ //test south
					inOut.push(new coords(cx, cy + 1)); //push cell
					setCellValue(cx, cy + 1, value + dv); //set cell cy + 1: value, set "seen": temp
				}

				inOut.shift(); //remove front of the stack
			}

		}
	}

	ctx.putImageData(canvasData, 0, 0);

	// inner functions
	function canMoveTo (x, y){
		if (x < 0 || y < 0 || x > canvas.width || y > canvas.height) { return false; } //test co-ordinates vs edge of world
		return (pixelMask[y][x] == 1); // true only if not visited & not avoid
	}

	function setCellValue (x, y, value){
		pixelMask[y][x] = 2;
		pixelData[y][x] = value;
	}
}

function xy2i (x, y) {return (x + y * canvas.width); } //convert 2D x and y co-ords to single 1D i co-ord

function drawPixel (canvasData, x, y, r, g, b) {
	var index4 = xy2i(x, y) * 4;
    canvasData.data[index4 + 0] = clerp(0, r);//r;
    canvasData.data[index4 + 1] = clerp(1, g);//g;
    canvasData.data[index4 + 2] = clerp(2, b);//b;
    canvasData.data[index4 + 3] = 255;
}
function drawPixelBack (canvasData, x, y){
	var index4 = xy2i(x, y) * 4; 
    canvasData.data[index4 + 0] = bgArray[0];//r;
    canvasData.data[index4 + 1] = bgArray[1];//g;
    canvasData.data[index4 + 2] = bgArray[2];//b;
    canvasData.data[index4 + 3] = 255;
}
function clerp(c, value) { return value * (ecArray[c] - scArray[c]) / 255 + scArray[c]; }

// storing x, y coordinates
class coords {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}