import "../css/index.scss";
import * as bootstrap from "bootstrap";
import { App } from "./App";
import { ModelPosition } from "./types";
export {};
{
    //http://localhost:40080
    //http://192.168.3.10:40080
    const serverURL = "http://192.168.3.10:40080";
    const debug: boolean = false;
    const modelPath = "/Resources/Hiyori_2/Hiyori.model3.json";

    //550, 900, 0.235, 0, -20 モデル全身/
    //550, 700, 0.45, 0, 500 モデル顔中心
    //225, 350, 0.25, 0, 250
    const position: ModelPosition = {
        boxWidth: 550,
        boxHeight: 700,
        modelScale: 0.45,
        modelX: 0,
        modelY: 500,
    };

    let app: App;

    window.addEventListener("load", () => {
        //console.log(audio_query);
        app = new App(debug, serverURL, modelPath, position); //
        app.mount();
    });

    window.addEventListener("beforeunload", () => {
        console.log("アンロード");
        app.unmount();
    });
    //let app: App | null = null;
    // DOMContentLoadedだと発火されないときがある;
    // document.addEventListener("DOMContentLoaded", () => {
    //     app.mount();
    // });
    //--ページ終了時の処理
    // window.addEventListener("beforeunload", () => {
    //     app.unmount();
    // });
    //-
}
