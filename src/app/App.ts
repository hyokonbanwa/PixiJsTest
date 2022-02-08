import * as PIXI from "pixi.js";
import { MyCanvas } from "./MyCanvas";
export class App {
    private pixiCanvas: MyCanvas;
    constructor() {
        this.pixiCanvas = new MyCanvas();
    }
    mount = () => {
        console.log("Appマウント");
    };
}
