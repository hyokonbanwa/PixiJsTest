import * as PIXI from "pixi.js";
import * as PIXILive2D from "pixi-live2d-display";
import { HitAreaFrames } from "./HitAreaFrames";

export class MyLive2dModel {
    private modelPath: string;
    public container: PIXI.Container;
    private model: (PIXI.Sprite & PIXILive2D.Live2DModel) | null;
    private modelBox: PIXI.Graphics;
    private boxWidth: number;
    private boxHeight: number;

    constructor(modelPath: string, modelWidth: number, modelHeight: number) {
        this.modelPath = modelPath;
        this.boxWidth = modelWidth;
        this.boxHeight = modelHeight;
        this.model = null;
        this.modelBox = new PIXI.Graphics();
        this.container = new PIXI.Container();
        this.container.addChild(this.modelBox);
    }
    async makeModel() {
        const modelOptions: PIXILive2D.Live2DFactoryOptions = {
            autoUpdate: false,
        };
        this.model = (await PIXILive2D.Live2DModel.from(this.modelPath, modelOptions)) as unknown as PIXI.Sprite & PIXILive2D.Live2DModel;
        this.model.anchor.set(0.5, 0.5);
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
        const hitAreaFrames = new HitAreaFrames();
        this.model.addChild(hitAreaFrames as unknown as PIXI.Graphics);
        this.container.addChild(this.model);
        this.model.position.set(this.boxWidth / 2, this.boxHeight / 2);
        this.modelBox.lineStyle(2, 0xff).drawRect(0, 0, this.boxWidth, this.boxHeight).lineStyle();
    }

    update = (deltaFrame: number) => {
        if (this.model != null) {
            const frameRate = 60 / deltaFrame; //フレームレートを求める
            const elapsedMs = 1000 / frameRate; //前回からの経過時間を求める
            this.model?.update(elapsedMs);
            console.log(elapsedMs);
        } else {
            console.log("nullモデルアップデート");
        }
    };
}
