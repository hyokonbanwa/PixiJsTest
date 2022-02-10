import * as PIXI from "pixi.js";
import * as PIXILive2D from "pixi-live2d-display";
import { HitAreaFrames } from "./HitAreaFrames";

export class MyLive2dModel {
    private modelPath: string;
    //public frameContainer: PIXI.Container;
    public container: PIXI.Container;
    public model: (PIXI.Sprite & PIXILive2D.Live2DModel) | null;
    public modelBox: PIXI.Graphics;
    private boxWidth: number;
    private boxHeight: number;
    private isFilter: boolean;
    private filterX: number | null;
    private filterY: number | null;
    private filterWidth: number | null;
    private filterHeight: number | null;

    constructor(modelPath: string, modelWidth: number, modelHeight: number) {
        this.modelPath = modelPath;
        this.boxWidth = modelWidth;
        this.boxHeight = modelHeight;

        this.isFilter = false;
        this.filterX = null;
        this.filterY = null;
        this.filterWidth = null;
        this.filterHeight = null;

        this.model = null;
        this.modelBox = new PIXI.Graphics();
        this.container = new PIXI.Container();
        this.container.addChild(this.modelBox);
        //this.frameContainer = new PIXI.Container();
        //this.frameContainer.addChild(this.container);
    }
    async makeModel() {
        const modelOptions: PIXILive2D.Live2DFactoryOptions = {
            autoUpdate: false,
        };
        this.model = (await PIXILive2D.Live2DModel.from(this.modelPath, modelOptions)) as unknown as PIXI.Sprite & PIXILive2D.Live2DModel;
        this.model.anchor.set(0.5, 0.5);
        //const x = await PIXILive2D.Live2DModel.from(this.modelPath, modelOptions);
        // model.x = 500;
        // model.y = 500;
        let modelScale: number = 1;

        console.log(`このモデルの高さは${this.model.height}、横幅は${this.model.width}`);
        //model.widthは更新すると書き変わる scaleの基準は最初にロードしたときのもの
        if (this.model.height > this.boxHeight) {
            modelScale = this.boxHeight / this.model.height;
            this.model.scale.set(modelScale, modelScale);
            if (this.model.width > this.boxWidth) {
                modelScale = modelScale * (this.boxWidth / this.model.width);
                this.model.scale.set(modelScale, modelScale);
            }
        } else {
            modelScale = this.boxWidth / this.model.width;
            this.model.scale.set(modelScale, modelScale);
            if (this.model.width > this.boxHeight) {
                modelScale = modelScale * (this.boxHeight / this.model.height);
                this.model.scale.set(modelScale, modelScale);
            }
        }
        //const hitAreaFrames = new HitAreaFrames();
        this.modelBox.lineStyle(2, 0xff).beginFill(0xffff99).drawRect(0, 0, this.boxWidth, this.boxHeight).endFill().lineStyle();
        // const food: PIXI.Sprite = PIXI.Sprite.from("/Resources/foodImgs/0002_カレー.jpg");
        // food.position.y = 0;

        // const mask2 = new PIXI.Graphics();
        // mask2.beginFill(0xffffff, 1);
        // mask2.drawRect(100, 0, 100, 800);
        // //mask.y = 200;
        // mask2.endFill();
        //mask.position.y = 300;

        //this.model.mask = mask;

        //this.model.addChild(hitAreaFrames as unknown as PIXI.Graphics);

        //this.model.mask = mask;
        //this.container.mask = mask;
        //console.log(this.model.isMask);
        //this.container.mask = mask2;

        //this.container.mask = mask;
        //food.mask = mask;
        //console.log(this.model.isMask);

        //maskの代わりにフィルターを使う　https://www.html5gamedevs.com/topic/28506-how-to-crophide-over-flow-of-sprites-which-clip-outside-of-the-world-boundaries/
        //voidFilter無いのでAlphaFilterを使う　https://api.pixijs.io/@pixi/filter-alpha/PIXI/filters/AlphaFilter.html
        //見えなくなるだけで当たり判定は存在している
        // this.container.filters = [new PIXI.filters.AlphaFilter(1)];
        // this.container.filterArea = new PIXI.Rectangle(0, 0, this.boxWidth, this.boxHeight / 2);
        this.container.addChild(this.model);
        //this.container.addChild(food);
        this.model.position.set(this.boxWidth / 2, this.boxHeight / 2);
    }

    //モデルを格納しているcontainerの左上頂点を基準点として描画したいエリアのx,y,width,heightを指定する
    maskRentagle = (x: number, y: number, width: number, height: number) => {
        this.container.filters = [new PIXI.filters.AlphaFilter(1)];
        const containerGlobal: PIXI.Point = this.container.getGlobalPosition();
        this.container.filterArea = new PIXI.Rectangle(containerGlobal.x + x, containerGlobal.y + y, width, height);
        this.filterX = x;
        this.filterY = y;
        this.filterWidth = width;
        this.filterHeight = height;
        this.isFilter = true;
    };

    update = (deltaFrame: number) => {
        if (this.model != null) {
            const frameRate = 60 / deltaFrame; //フレームレートを求める
            const elapsedMs = 1000 / frameRate; //前回からの経過時間を求める
            this.model?.update(elapsedMs);
            // console.log("位置");
            // console.log(elapsedMs);
            if (this.isFilter === true && this.filterX != null && this.filterY != null && this.filterWidth != null && this.filterHeight != null) {
                const containerGlobal: PIXI.Point = this.container.getGlobalPosition();

                // console.log(this.container.position);
                // console.log(containerGlobal);
                this.container.filterArea = new PIXI.Rectangle(containerGlobal.x + this.filterX, containerGlobal.y + this.filterY, this.filterWidth, this.filterHeight);
            }
        } else {
            console.log("nullモデルアップデート");
        }
    };
}
