import * as PIXI from "pixi.js";
import { MyCanvas } from "./MyCanvas";
export class App {
    private pixiCanvas: MyCanvas;
    constructor() {
        this.pixiCanvas = new MyCanvas();
    }
    mount = () => {
        console.log("Appマウント");
        //pixiアプリ初期化
        this.pixiCanvas.initialize();

        //ボタンリスナー登録
        const startButton = document.getElementById("speakStart") as HTMLElement;
        startButton.addEventListener("click", (e: MouseEvent) => {
            this.pixiCanvas.hiyori.startSpeak(1);
        });
        const stopButton = document.getElementById("speakStop") as HTMLElement;
        stopButton.addEventListener("click", (e: MouseEvent) => {
            this.pixiCanvas.hiyori.stopSpeak();
        });
        const normalButton = document.getElementById("normalEx") as HTMLElement;
        normalButton.addEventListener("click", (e: MouseEvent) => {
            this.pixiCanvas.hiyori.setExpression("normal1");
        });
        const negativeButton = document.getElementById("negativeEx") as HTMLElement;
        negativeButton.addEventListener("click", (e: MouseEvent) => {
            this.pixiCanvas.hiyori.setExpression("angry1");
        });
    };
}
