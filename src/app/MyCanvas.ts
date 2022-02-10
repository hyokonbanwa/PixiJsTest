import * as PIXI from "pixi.js";
import * as PIXILive2D from "pixi-live2d-display";
import { MyLive2dModel } from "./Elements";
import { threadId } from "worker_threads";
// declare global {
//     interface Window {
//         PIXI: any;
//     }
// }

type IApplicationOptions = {
    autoStart?: boolean;
    width?: number;
    height?: number;
    view?: HTMLCanvasElement;
    transparent?: boolean;
    autoDensity?: boolean;
    antialias?: boolean;
    preserveDrawingBuffer?: boolean;
    resolution?: number;
    forceCanvas?: boolean;
    backgroundColor?: number;
    clearBeforeRender?: boolean;
    powerPreference?: string;
    sharedTicker?: boolean;
    sharedLoader?: boolean;
    resizeTo?: Window | HTMLElement;
};

export class MyCanvas {
    private app: PIXI.Application;
    private hiyori: MyLive2dModel;
    //使うものを列挙する
    constructor() {
        //window.PIXI = PIXI;
        // PIXI.Application.registerPlugin(PIXI.TickerPlugin);
        // Live2DModel.registerTicker(PIXI.Ticker);
        //オプション　https://pixijs.download/release/docs/PIXI.Application.html
        const pixiOptions: IApplicationOptions = {
            width: 1000,
            height: 1000,
            view: document.getElementById("myCanvas") as HTMLCanvasElement,
            backgroundColor: 0x990000,
            //transparent: true, //http://runstant.com/pentamania/projects/82dc0e31
        };
        this.app = new PIXI.Application(pixiOptions);
        this.hiyori = new MyLive2dModel("/Resources/Hiyori/Hiyori.model3.json", 600, 800);
        this.initialize();
    }
    //ロード処理と初期配置を書く
    initialize = async () => {
        await this.hiyori.makeModel();
        const hiyoriModel = this.hiyori.container;
        const stage = this.app.stage;
        //hiyoriModel?.position.set(500, 500);
        stage.addChild(hiyoriModel);
        stage.addChild(this.hiyori.container);
        this.hiyori.maskRentagle(150, 50, 300, 350);
        hiyoriModel.position.set(400, 100);
        hiyoriModel.interactive = true;
        hiyoriModel.on("pointertap", (e: any) => {
            console.log("クリック");
            console.log(e);
        });
        console.log(hiyoriModel.position);
        // const mask = new PIXI.Graphics();
        // mask.beginFill(0xffffff, 1);
        // mask.drawRect(0, 0, 600, 400);
        // //mask.position.y = 300;
        // hiyoriModel.mask = mask;
        // const mask = new PIXI.Graphics();
        // mask.beginFill(0xffffff, 1);
        // mask.drawRect(0, 0, 500, 400);
        // mask.position.y = 400;
        // //mask.y = 200;
        // mask.endFill();
        // // stage.addChild(mask);
        // // if (this.hiyori.model) {
        // //     this.hiyori.container.mask = mask;
        // // }

        // hiyoriModel.addChild(mask);
        // this.hiyori.container.filters = [new PIXI.filters.AlphaFilter(1)];
        // this.hiyori.container.filterArea = new PIXI.Rectangle(0, 0, 500, 400); //<-- its SCREEN coords,you have to  calculate the part of screen that must be drawn
        this.addUpdate();
        // const food: PIXI.Sprite = PIXI.Sprite.from("/Resources/foodImgs/0002_カレー.jpg");
        // this.app.stage.addChild(food);
        // food.position.set(450, 450);
        // const modelOptions: PIXILive2D.Live2DFactoryOptions = {
        //     autoUpdate: false,
        // };
        // const model = (await PIXILive2D.Live2DModel.from("/Resources/Hiyori/Hiyori.model3.json", modelOptions)) as unknown as PIXI.Sprite & PIXILive2D.Live2DModel;
        // // model.x = 500;
        // // model.y = 500;
        // const height = 800;
        // const width = 500;
        // console.log(`このモデルの高さは${model.height}、横幅は${model.width}`);
        // if (model.height > model.width) {
        //     model.scale.set(height / model.height, height / model.height);
        // } else {
        //     model.scale.set(width / model.width, width / model.width);
        // }
        // this.app.stage.addChild(model);
        // transforms
        // model.x = 500;
        // model.y = 500;
        // model.rotation = Math.PI;
        // model.skew.x = Math.PI;
        // model.scale.set(0.25, 0.25);
        // model.anchor.set(0.5, 0.5);
        //動く
        //これを大本でtickeradd(this.hiyori.update)のようにする
        // this.app.ticker.add(() => {
        //     model.update(this.app?.ticker.elapsedMS as number);
        //     //console.log(this.app?.ticker.elapsedMS);
        // });
        // const ticker = new PIXI.Ticker();
        // ticker.add(() => model.update(ticker.elapsedMS));
    };

    //時間経過で必要になる処理を加えていく
    addUpdate = () => {
        this.app.ticker.add(this.hiyori.update);
        // if (this.hiyori.model != null) {
        //     //this.app.ticker.add(() => this.hiyori?.model?.update(this.app.ticker.elapsedMS));
        //     // this.app.ticker.add((delta) => {
        //     //     //console.log(params);
        //     //     //deltaとelapsedmsの違い　https://www.html5gamedevs.com/topic/36268-pixiticker-deltatime-vs-elapsedms/
        //     //     console.log("デルタ:" + delta); //1秒間に60FPSを基準として前回のフレームから何フレーム分更新したか、60fpsでのフレーム単位の処理を書く 1Frame /(144FPS / 60FPS) = 0.42Frame
        //     //     console.log(this.app.ticker.elapsedMS); //前回のフレームから何ms更新したか 1000ms/ 144 = 7ms、ミリ秒単位の処理を書く
        //     // });
        // }
    };
}