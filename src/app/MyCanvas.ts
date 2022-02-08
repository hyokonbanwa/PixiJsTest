import * as PIXI from "pixi.js";
import { Live2DModel, Live2DFactoryOptions } from "pixi-live2d-display";
declare global {
    interface Window {
        PIXI: any;
    }
}

export class MyCanvas {
    //private app: PIXI.Application | null;
    constructor() {
        // window.PIXI = PIXI;
        // this.app = null;
        // this.modeload();
    }
    modeload = async () => {
        // PIXI.Application.registerPlugin(PIXI.TickerPlugin);
        // Live2DModel.registerTicker(PIXI.Ticker);
        //オプション　https://pixijs.download/release/docs/PIXI.Application.html
        // const pixiOptions: PIXI.IApplicationOptions = {
        //     width: 1000,
        //     height: 1000,
        //     view: document.getElementById("myCanvas") as HTMLCanvasElement,
        //     transparent: true, //http://runstant.com/pentamania/projects/82dc0e31
        // };
        // this.app = new PIXI.Application(pixiOptions);
        // const food: PIXI.Sprite = PIXI.Sprite.from("/Resources/foodImgs/0002_カレー.jpg");
        // this.app.stage.addChild(food);
        // const modelOptions: Live2DFactoryOptions = {
        //     autoUpdate: false,
        // };
        // const model = (await Live2DModel.from("/Resources/Hiyori/Hiyori.model3.json", modelOptions)) as unknown as PIXI.DisplayObject & Live2DModel;
        // model.x = 500;
        // model.y = 500;
        // this.app.stage.addChild(model);
        // // const ticker = new PIXI.Ticker();
        // // ticker.add(() => model.update(ticker.elapsedMS));
    };
}
