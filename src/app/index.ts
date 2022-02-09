import "../css/index.scss";
import * as bootstrap from "bootstrap";
import { App } from "./App";
import * as PIXI from "pixi.js";
import { Live2DModel, Live2DFactoryOptions } from "pixi-live2d-display";

{
    // async function init() {
    //     const pixiOptions = {
    //         width: 1000,
    //         height: 1000,
    //         view: document.getElementById("myCanvas") as HTMLCanvasElement,
    //         transparent: true, //http://runstant.com/pentamania/projects/82dc0e31
    //     };
    //     const app = new PIXI.Application(pixiOptions);
    //     const food: PIXI.Sprite = PIXI.Sprite.from("/Resources/foodImgs/0002_カレー.jpg");
    //     app.stage.addChild(food);
    //     const modelOptions: Live2DFactoryOptions = {
    //         autoUpdate: false,
    //     };
    //     const model = (await Live2DModel.from("/Resources/Hiyori/Hiyori.model3.json", modelOptions)) as unknown as PIXI.DisplayObject & Live2DModel;
    //     model.x = 500;
    //     model.y = 500;
    //     app.stage.addChild(model);
    //     const ticker = new PIXI.Ticker();
    //     ticker.add(() => model.update(ticker.elapsedMS));
    // }
    // init();
    //-- App初期化

    const app: App = new App();
    app.mount();
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
