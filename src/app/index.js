import "../css/index.scss";
import * as bootstrap from "bootstrap";
import { App } from "./App";
import * as PIXI from "pixi.js";
//window.PIXI = PIXI;
import { Live2DModel, Live2DFactoryOptions } from "pixi-live2d-display";

// PIXI.Application.registerPlugin(PIXI.TickerPlugin);
// Live2DModel.registerTicker(PIXI.Ticker);

{
    // async function init() {
    //     const pixiOptions: PIXI.IApplicationOptions = {
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
    //let app: App | null = null;
    // const app: App = new App();
    // app.mount();
    //DOMContentLoadedだと発火されないときがある
    // document.addEventListener("DOMContentLoaded", () => {
    //     app.mount();
    // });
    //--ページ終了時の処理
    // window.addEventListener("beforeunload", () => {
    //     app.unmount();
    // });
    //-
    const cubism2Model = "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json";
    const cubism4Model = "../Resources/Hiyori/Hiyori.model3.json";

    async function main() {
        const app = new PIXI.Application({
            view: document.getElementById("canvas"),
        });

        const model = await Live2DModel.from(cubism4Model, { autoUpdate: false });

        app.stage.addChild(model);

        // transforms
        model.x = 500;
        model.y = 500;
        model.rotation = Math.PI;
        model.skew.x = Math.PI;
        model.scale.set(0.25, 0.25);
        model.anchor.set(0.5, 0.5);

        //動く
        //これを大本でtickeradd(this.hiyori.update)のようにする
        app.ticker.add(() => {
            model.update(app.ticker.elapsedMS);
            console.log(app.ticker.elapsedMS);
        });

        //動く
        // setInterval(() => {
        //     model.update(20);
        // }, 20);

        //動く
        // let then = performance.now();
        // function tick(now) {
        //     model.update(now - then);
        //     then = now;
        //     requestAnimationFrame(tick);
        // }

        // requestAnimationFrame(tick);
        // // interaction
        // model.on("hit", (hitAreas) => {
        //     if (hitAreas.includes("body")) {
        //         model.motion("tap_body");
        //     }
        // });
    }
    main();
}
