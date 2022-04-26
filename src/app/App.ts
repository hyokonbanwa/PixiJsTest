import * as PIXI from "pixi.js";
import { MyCanvas } from "./MyCanvas";
export class App {
    private pixiCanvas: MyCanvas;
    constructor() {
        this.pixiCanvas = new MyCanvas();
    }
    mount = () => {
        console.log("Appマウント");
        const startButton = document.getElementById("speakStart") as HTMLElement;
        startButton.addEventListener("click", (e: MouseEvent) => {
            this.pixiCanvas.hiyori.startSpeak(1);
        });
        const stopButton = document.getElementById("speakStop") as HTMLElement;
        stopButton.addEventListener("click", (e: MouseEvent) => {
            this.pixiCanvas.hiyori.stopSpeak();
        });
    };
}
