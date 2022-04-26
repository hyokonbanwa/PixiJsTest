import * as PIXI from "pixi.js";
import * as PIXILive2D from "pixi-live2d-display";
import { HitAreaFrames } from "./HitAreaFrames";

export class MyLive2dModel {
    private modelPath: string;
    //public frameContainer: PIXI.Container;
    private container: PIXI.Container;
    private model: (PIXI.Sprite & PIXILive2D.Live2DModel) | null;
    private modelHitArea: HitAreaFrames | PIXI.Graphics;
    private modelBox: PIXI.Graphics;
    private boxWidth: number;
    private boxHeight: number;
    private modelScale: number;
    private modelX: number;
    private modelY: number;
    private isMouseOn: boolean;
    private speakSpeed: number;
    private speaking: boolean;

    constructor(modelPath: string, boxWidth: number, boxHeight: number, modelScale?: number, modelX?: number, modelY?: number) {
        this.modelPath = modelPath;
        this.boxWidth = boxWidth;
        this.boxHeight = boxHeight;
        // let model: PIXILive2D.Live2DModel;
        // model.on = (await PIXILive2D.Live2DModel.from(this.modelPath))
        this.modelScale = modelScale ?? 1;
        this.modelX = modelX ?? 0;
        this.modelY = modelY ?? 0;

        this.model = null;
        this.modelHitArea = new HitAreaFrames();
        this.modelBox = new PIXI.Graphics();
        this.container = new PIXI.Container();
        //beginFillでalpha指定するとその透明度のオブジェクトができる
        //Graphics.alphaとbeginFillのalphaは別物
        this.modelBox.beginFill(0xffff99).drawRect(0, 0, this.boxWidth, this.boxHeight).endFill();
        this.modelBox.alpha = 0;
        this.container.addChild(this.modelBox);
        this.isMouseOn = false;
        this.speakSpeed = 0;
        this.speaking = false;
    }
    async makeModel() {
        //モデルの配置
        const modelOptions: PIXILive2D.Live2DFactoryOptions = {
            autoUpdate: false,
            autoInteract: true,
            idleMotionGroup: "Idle",
        };
        this.model = (await PIXILive2D.Live2DModel.from(this.modelPath, modelOptions)) as unknown as PIXI.Sprite & PIXILive2D.Live2DModel;
        this.model.anchor.set(0.5, 0.5);
        this.model.scale.set(this.modelScale, this.modelScale);
        console.log(this.modelX, this.modelY);
        //this.model.position.set(this.modelX, this.modelY);
        this.model.position.set(this.boxWidth / 2 + this.modelX, this.boxHeight / 2 + this.modelY);
        console.log(`このモデルの高さは${this.model.height}、横幅は${this.model.width}`);
        this.modelHitArea.visible = false;
        this.model?.addChild(this.modelHitArea);
        this.container.addChild(this.model);

        //modelBoxにマウスが収まっていた時にonModelBox = trueとする
        this.isMouseOn = false;
        this.container.interactive = true;
        this.container.on("mousemove", (e: PIXI.InteractionEvent) => {
            // e.stopPropagation();
            // e.stopped = true;
            const localPosition = e.data.getLocalPosition(e.currentTarget);
            const globalPosition = e.data.global;
            // console.log(position);
            // console.log(this.boxWidth, this.boxHeight);
            if (this.model !== null) {
                if (this.onModelBox(localPosition) === true && this.model.hitTest(globalPosition.x, globalPosition.y).length !== 0) {
                    this.model.buttonMode = true;
                    //console.log("乗った");
                    this.isMouseOn = true;
                } else {
                    this.model.buttonMode = false;
                    //console.log("離れた");
                    this.isMouseOn = false;
                }
            }
        });

        //モデルをタップした時の反応調整
        this.model.interactive = true;
        this.model.on("hit", (hitAreaNames: Array<String>) => {
            if (hitAreaNames.includes("Body") === true && this.isMouseOn === true && this.model !== null) {
                console.log("モデルタップ2");
                this.model.motion("TapBody", undefined, PIXILive2D.MotionPriority.FORCE);

                // the body is hit
            }
        });

        //口パクのために live2Dmodel.internalModelのアップデート関数を上書きする
        //cubisum4InternalModel https://github.com/guansss/pixi-live2d-display/blob/b51b9cb/src/cubism4/Cubism4InternalModel.ts#L172
        //internalModel https://github.com/guansss/pixi-live2d-display/blob/b51b9cb/src/cubism-common/InternalModel.ts#L252
        const internalModel: PIXILive2D.Cubism4InternalModel = this.model.internalModel as PIXILive2D.Cubism4InternalModel;
        const motionManager: PIXILive2D.MotionManager = this.model.internalModel.motionManager;
        const coreModel: MyCubismModel = this.model.internalModel.coreModel as MyCubismModel;
        internalModel.update = (dt: DOMHighResTimeStamp, now: DOMHighResTimeStamp): void => {
            //super.update(dt, now);
            internalModel.focusController.update(dt); //internalModel.update()と同義　インスタンスの親クラスのメソッドを使う方法探す

            // cubism4 uses seconds
            dt /= 1000;
            now /= 1000;

            const model = coreModel;

            internalModel.emit("beforeMotionUpdate");

            const motionUpdated = motionManager.update(coreModel, now);

            internalModel.emit("afterMotionUpdate");

            model.saveParameters();

            if (!motionUpdated) {
                internalModel.eyeBlink?.updateParameters(internalModel.coreModel, dt);
            }

            internalModel.updateFocus();

            // revert the timestamps to be milliseconds
            internalModel.updateNaturalMovements(dt * 1000, now * 1000);

            //------------- ここを有効化した
            //Live2Dmodel.motion()、live2Dmodel.expression()によらないパラメーター操作はここで行う
            // TODO: Add lip sync API
            if (internalModel.lipSync === true && this.speaking === true) {
                const value = Math.abs(Math.sin(2 * Math.PI * this.speakSpeed * now)); // 0 ~ 1

                model.addParameterValueById("ParamMouthOpenY", value, 0.8);
                //console.log("口："+coreModel.getParameterValueById("ParamMouthOpenY"));
            }
            //-----------

            internalModel.physics?.evaluate(internalModel.coreModel, dt);
            internalModel.pose?.updateParameters(internalModel.coreModel, dt);

            internalModel.emit("beforeModelUpdate");

            model.update();
            model.loadParameters();
            //console.log("updateしてる");
        };

        // const motionManager: PIXILive2D.MotionManager = this.model.internalModel.motionManager;
        // console.log(motionManager.update);
        // console.log(this.model.update);
        // motionManager.update = (...args): boolean => {
        //     coreModel.addParameterValueById("ParamMouthOpenY", 0.1, 0.8);
        //     return true;
        // };

        //         //マスクテスト
        //         const food: PIXI.Sprite = PIXI.Sprite.from("/Resources/foodImgs/0002_カレー.jpg");
        //         this.container.addChild(food);
        //         const mask2 = new PIXI.Graphics();
        //         mask2.beginFill(0xffffff, 1).drawRect(0, 0, 100, 100).endFill();
        //         food.addChild(mask2); //マスクが追従する
        //         food.mask = mask2;
        //         food.y = 50;
        //         console.log(food.isMask);

        //         const mask = new PIXI.Graphics();
        //         mask.beginFill(0xffffff, 1).drawRect(0, 0, 1000, 1000).endFill();
        //         console.log(mask.position.x, mask.position.y);
        //         const mask3 = mask.clone();

        //         this.model.addChild(mask);
        //         mask.position.set(this.model.width, this.model.height);
        //         console.log(mask.position.x, mask.position.y);
        //         //this.model.mask = mask;
        //         console.log(this.model.isMask);
        //         //this.model.addChild(mask3);
        //         //mask3.position.set(this.model.width, this.model.height);
        //         console.log(mask3.position.x, mask3.position.y);
    }
    update = (deltaFrame: number): void => {
        if (this.model != null) {
            //モデルのアップデート
            const frameRate = 60 / deltaFrame; //フレームレートを求める
            const elapsedMs = 1000 / frameRate; //前回からの経過時間を求める
            this.model?.update(elapsedMs);

            //maskの代わりにフィルターを使う　https://www.html5gamedevs.com/topic/28506-how-to-crophide-over-flow-of-sprites-which-clip-outside-of-the-world-boundaries/
            //voidFilter無いのでAlphaFilterを使う　https://api.pixijs.io/@pixi/filter-alpha/PIXI/filters/AlphaFilter.html
            //見えなくなるだけで当たり判定は存在している
            this.container.filters = [new PIXI.filters.AlphaFilter(1)];
            const containerGlobal: PIXI.Point = this.container.getGlobalPosition();
            this.container.filterArea = new PIXI.Rectangle(containerGlobal.x, containerGlobal.y, this.boxWidth, this.boxHeight);
            if (this.isMouseOn === false) {
                const modelGlobal: PIXI.Point = this.model.getGlobalPosition();
                this.model.focus(modelGlobal.x, modelGlobal.y);
            }

            // const coreModel: MyCubismModel = this.model.internalModel.coreModel as MyCubismModel;
            //console.log(coreModel.getParameterValueById("ParamMouthOpenY"));

            //現在のモーションの詳細 https://github.com/guansss/pixi-live2d-display/blob/b51b9cb/src/cubism-common/MotionManager.ts#:~:text=state%20%3D%20new%20MotionState()%3B
            //console.log(this.model.internalModel.motionManager.state);
        } else {
            console.log("nullモデルアップデート");
        }
    };
    getContainer = (): PIXI.Container => {
        return this.container;
    };
    displayBox = () => {
        this.modelBox.alpha = 1;
    };
    hitAreaOn = (): void => {
        this.modelHitArea.visible = true;
    };
    hitAreaOff = (): void => {
        this.modelHitArea.visible = false;
    };
    //モデルを格納しているcontainerの左上頂点を基準点として描画したいエリアのx,y,width,heightを指定する
    // maskRentagle = () => {
    //     this.container.filters = [new PIXI.filters.AlphaFilter(1)];
    //     const containerGlobal: PIXI.Point = this.container.getGlobalPosition();
    //     this.container.filterArea = new PIXI.Rectangle(containerGlobal.x + x, containerGlobal.y + y, width, height);
    //     this.filterX = this.container.x;
    //     this.filterY = this.container.y;
    //     this.filterWidth = width;
    //     this.filterHeight = height;
    //     this.isFilter = true;
    // };
    onModelBox = (point: PIXI.Point): boolean => {
        if (point.x >= 0 && point.y >= 0 && point.x <= this.boxWidth && point.y <= this.boxHeight) {
            return true;
        } else {
            return false;
        }
    };

    startSpeak = (speakSpeed: number): void => {
        if (this.model !== null && speakSpeed >= 0) {
            console.log("口パク開始");
            this.speaking = true;
            this.speakSpeed = speakSpeed;
            this.model.motion("StartSpeak", undefined, PIXILive2D.MotionPriority.FORCE);
            this.model.internalModel.motionManager.groups.idle = "StartSpeak";
        } else {
            console.log("Invalid Speak Speed");
        }
    };
    stopSpeak = (): void => {
        if (this.model !== null) {
            console.log("口パク終了");
            this.speaking = false;
            this.speakSpeed = 0;
            this.model.internalModel.motionManager.groups.idle = "Idle";
        }
    };
}
