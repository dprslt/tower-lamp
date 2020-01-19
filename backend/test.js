import '@babel/polyfill'
import {CanvaScreen} from "./src/screen/CanvaScreen";
import { createCanvas, loadImage } from 'canvas';

const canvaScreen = new CanvaScreen(100,500, null, null, 10)



import Konva from 'konva-node';


var stage = new Konva.Stage({
  width: 100,
  height: 100
});

console.log('toto')
stage.clear()
console.log('toto')

