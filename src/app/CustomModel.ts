import * as PIXI from "pixi.js";
import * as PIXILive2D from "pixi-live2d-display";
import { EventEmitter } from "eventemitter3";
import { HitAreaFrames } from "./HitAreaFrames";

interface DragObject extends PIXI.DisplayObject {
    dragging: boolean;
    data: PIXI.InteractionData | null;
}

interface CustomModelSettings extends PIXILive2D.ModelSettings {
    expressions?: Object[];
    groups?: Object[];
    hitAreas?: Object[];
    layout?: any;
    motions?: Object[];
}
/**
 * ToDo
 * 回転に対応
 * 任意の図形で切り抜けるようにする
 **/
//欠陥：モーションに一意の番号が無いので、予約再生時にモーションを区別できない よってgithubからソースを持ってきてMotionStateが一意のキーを持てるようにする必要がある

//イベント一覧
//onHitAreaOverでモデルの当たり判定エリアにマウスが乗ったときの動作を追加できる
//onModelHitでモデルをクリックしたときの動作を追加できる。
//onStartSpeakでモデルが話し始めたときの処理を追加できる。
//onStopSpeakでモデルが話し終わる（中断させる）ときの処理を追加できる。
//onModelUpdateでモデルの毎回のアップデートの処理を追加できる。
//onFinishSpeakでボイスが最後まで再生されたときの処理を追加できる。
//onMotionFinishedでモーションが中断されず最後まで再生されたときの処理を追加できる
//onMotionStartedでモーションが開始されたときの処理を追加できる

//model3.jsonファイルで「当たり判定エリア名(HitAreas)」と「あるエリアをタップした時のMotionGoup名」と、を同じにしておく

export class CustomModel extends EventEmitter {
    //モデルがマウスを追うかどうかを決める
    public mouseLooking: boolean;

    public container: PIXI.Container; //モデルと枠を格納するコンテナ
    private containerScaleX: number;
    private containerScaleY;

    private modelBox: PIXI.Graphics; //モデルの枠＝箱
    private boxWidth: number; //モデルの枠の横幅
    private boxHeight: number; ////モデルの枠の縦幅

    private filterRectagle: PIXI.Rectangle;

    private modelHitArea: HitAreaFrames | PIXI.Graphics; //モデルの当たり判定を表すフレーム

    //モデル関係
    private modelPath: string; //model3.jsonの位置
    private model: (PIXI.Sprite & PIXILive2D.Live2DModel) | null; //Live2DModelインスタンス
    private modelScale: number; //モデルの表示倍率
    //modelBox中心からどれだけずれるかxyで決める
    private modelX: number; //枠の中心からのオフセットx
    private modelY: number; //枠の中心からのオフセットy

    //当たり判定関係
    private _isBoxOn: boolean; //エージェントの箱の上に乗っているか＝視線追従の基準、モデルタップの前提条件
    private _isHit: boolean; //モデルとマウスの当たり判定が生じているかどうか＝hitイベントの時の発火基準

    //発声関係
    private speaking: boolean; //モデルが口パクしているかどうか
    private speakSpeed: number; //モデルの口パクスピード | 2π x speakSpeed x t | で用いる
    private voicing: boolean; //モデルが発声しているかどうか
    private voiceVolume: number; //モデルの音量

    //表情関係
    private currentExpression: number | null;
    private normalExpressionIndex: number | string;

    //モーション関係
    private motionFinished: boolean; //モデルが前のフレームでアップデートされていたかどうか
    private _dragging: boolean; //drag中であるかを表す
    private _draggable: boolean;
    // private reservedPriority: string;
    // private reservedIndex: string;

    //音声再生関係;
    private intervalVoiceID: number | null;
    private _audioContext: AudioContext | null;
    private voiceSource: AudioBufferSourceNode | null;

    /**
     *モデルの設定の初期化
     * @param {string} modelPath モデルのパス(~~/hoge.model3.json)を指定する
     * @param {number}boxWidth モデルを入れる箱の横幅
     * @param {number}boxHeight 縦幅
     * @param {number}modelScale 箱の中のモデルの拡大率
     * @param {}modelX 箱の中のモデルが中心から
     * @param {}modelY
     */
    constructor(modelPath: string, normalExpressionIndex: number | string, boxWidth: number, boxHeight: number, modelScale?: number, modelX?: number, modelY?: number) {
        super();
        this.container = new PIXI.Container();
        // this.containerWidth = this.container.width;
        // this.containerHeight = this.container.height;

        this.filterRectagle = new PIXI.Rectangle();
        this.container.filters = [new PIXI.filters.AlphaFilter(1)];

        //beginFillでalpha指定するとその透明度のオブジェクトができる
        //Graphics.alphaとbeginFillのalphaは別物
        this.boxWidth = boxWidth;
        this.boxHeight = boxHeight;
        this.containerScaleX = 1.0;
        this.containerScaleY = 1.0;
        this.modelBox = new PIXI.Graphics();
        this.modelBox.beginFill(0xffff99).drawRect(0, 0, this.boxWidth, this.boxHeight).endFill();
        this.modelBox.alpha = 0;
        this.container.addChild(this.modelBox);

        this.modelHitArea = new HitAreaFrames();

        this.modelPath = modelPath;
        this.model = null;
        // let model: PIXILive2D.Live2DModel;
        // model.on = (await PIXILive2D.Live2DModel.from(this.modelPath))
        this.modelScale = modelScale ?? 1;
        this.modelX = modelX ?? 0;
        this.modelY = modelY ?? 0;

        this._isBoxOn = false;
        this._isHit = false;

        this.speaking = false;
        this.speakSpeed = -1;
        this.voicing = false;
        this.voiceVolume = -1;

        this.currentExpression = null;
        this.normalExpressionIndex = normalExpressionIndex;

        this.motionFinished = true; //初回はtrueにしておく
        this._dragging = false;
        this._draggable = false;

        this.mouseLooking = true;

        this._audioContext = null;
        this.voiceSource = null;
        this.intervalVoiceID = null;
    }

    /**
     * モデルを非同期で生成する関数
     */
    async makeModel() {
        //モデルの配置
        const modelOptions: PIXILive2D.Live2DFactoryOptions = {
            autoUpdate: false, //自動更新
            autoInteract: true, //元々のインタラクション
            motionPreload: PIXILive2D.MotionPreloadStrategy.ALL, //どれだけ事前にモデルのモーションを読み込むか
        };
        this.model = (await PIXILive2D.Live2DModel.from(this.modelPath, modelOptions)) as unknown as PIXI.Sprite & PIXILive2D.Live2DModel;

        const setPosition = () => {
            if (this.model !== null) {
                this.model.anchor.set(0.5, 0.5);
                this.model.scale.set(this.modelScale, this.modelScale);

                this.model.position.set(this.boxWidth / 2 + this.modelX, this.boxHeight / 2 + this.modelY);
                //console.log(`このモデルの高さは${this.model.height}、横幅は${this.model.width}`);
                this.modelHitArea.visible = false;
                this.model?.addChild(this.modelHitArea);
                this.container.addChild(this.model);
            }
        };
        setPosition();

        const setListener = () => {
            if (this.model === null) return console.log("モデルがない");

            this.container.interactive = true;

            //マウスが動いた時のリスナー登録
            this.container.on("mousemove", (e: PIXI.InteractionEvent) => {
                if (this.model === null) return console.log("モデルがない");
                //イベント伝播を止める
                e.stopPropagation();
                e.stopped = true;
                //
                //console.log("イベント");

                // const localPosition = e.data.getLocalPosition(e.currentTarget);//マウスのローカル座標
                const globalPosition = e.data.global; //マウスのグローバル座標

                ////modelBoxにマウスが収まっていた時にonModelBox = trueとする
                if (this.filterRectagle.contains(globalPosition.x, globalPosition.y) === true) {
                    this._isBoxOn = true;

                    //hitTestの帰り値は配列
                    const hitAreas: string[] = this.model.hitTest(globalPosition.x, globalPosition.y);
                    if (hitAreas.length !== 0 && this._dragging === false) {
                        //当たったエリアの配列が帰ってくる
                        //console.log(this.model.hitTest(globalPosition.x, globalPosition.y));
                        this._isHit = true;
                        this.emit("HitAreaOver", hitAreas);
                        //this.model.buttonMode = true;
                        //console.log("乗った");
                    } else {
                        this._isHit = false;
                        //this.model.buttonMode = false;
                    }
                } else {
                    this._isHit = false;
                    //this.model.buttonMode = false;
                    //console.log("離れた");
                    this._isBoxOn = false;
                }
            });
            //モデルをタップした時に実行される
            this.model.interactive = true;
            this.model.on("hit", (hitAreaNames: Array<String>) => {
                if (this.model !== null && this._isHit === true) {
                    //それぞれのエリアごとに当たり判定を見ていく
                    Object.keys(this.model.internalModel.hitAreas).forEach((area: string) => {
                        //console.log(area);
                        if (hitAreaNames.includes(area) === true) {
                            this.emit("ModelHit", area); //---------------------------------------------------

                            // the body is hit
                        }
                    });
                }
            });

            let offsetX: number | null;
            let offsetY: number | null;
            const onDragStart = (event: PIXI.InteractionEvent): void => {
                // store a reference to the data
                // the reason for this is because of multitouch
                // we want to track the movement of this particular touch

                //this._draggable = false　なら実行しない
                if (this._isBoxOn === false || this._draggable === false) return;
                const target: DragObject = event.currentTarget as DragObject;
                target.data = event.data;

                target.dragging = true;

                //親要素基準のマウスのローカルポジション
                const localPosition = event.data.getLocalPosition(target.parent);
                //console.log(localPosition);
                offsetX = localPosition.x - target.x;
                offsetY = localPosition.y - target.y;
                //console.log(offsetX, offsetY);
                // const globalPosition = event.data.global;
                // console.log(globalPosition);
                //offsetX = globalPosition.x -
            };

            const onDragEnd = (event: PIXI.InteractionEvent): void => {
                const target: DragObject = event.currentTarget as DragObject;
                if (target.dragging === true) {
                    this._dragging = false;

                    target.alpha = 1;
                    this.container.filters = [new PIXI.filters.AlphaFilter(1)];
                    target.dragging = false;
                    // set the interaction data to null
                    target.data = null;

                    offsetX = null;
                    offsetY = null;
                }
            };

            const onDragMove = (event: PIXI.InteractionEvent): void => {
                const target: DragObject = event.currentTarget as DragObject;
                if (target.dragging === true && target.data !== null && offsetX !== null && offsetY !== null) {
                    this._dragging = true;
                    target.alpha = 0.5;
                    this.container.filters = [new PIXI.filters.AlphaFilter(0.5)];
                    const newPosition = target.data.getLocalPosition(target.parent);
                    target.x = newPosition.x - offsetX;
                    target.y = newPosition.y - offsetY;
                }
            };
            this.container.on("pointerdown", onDragStart).on("pointerup", onDragEnd).on("pointerupoutside", onDragEnd).on("pointermove", onDragMove);

            // function onDragStart(event: PIXI.InteractionEvent) {
            //     const obj = event.currentTarget as DragObject;
            //     obj.dragData = event.data;
            //     obj.dragging = 1;
            //     obj.dragPointerStart = event.data.getLocalPosition(obj.parent);
            //     obj.dragObjStart = new PIXI.Point();
            //     obj.dragObjStart.copyFrom(obj.position);
            //     obj.dragGlobalStart = new PIXI.Point();
            //     obj.dragGlobalStart.copyFrom(event.data.global);
            // }

            // function onDragEnd(event: PIXI.InteractionEvent) {
            //     const obj = event.currentTarget as DragObject;
            //     if (!obj.dragging) return;

            //     snap(obj);

            //     obj.dragging = 0;
            //     // set the interaction data to null
            //     // obj.dragData = null
            // }

            // function onDragMove(event: PIXI.InteractionEvent) {
            //     const obj = event.currentTarget as DragObject;
            //     if (!obj.dragging) return;
            //     const data = obj.dragData; // it can be different pointer!
            //     if (obj.dragging === 1) {
            //         // click or drag?
            //         if (Math.abs(data.global.x - obj.dragGlobalStart.x) + Math.abs(data.global.y - obj.dragGlobalStart.y) >= 3) {
            //             // DRAG
            //             obj.dragging = 2;
            //         }
            //     }
            //     if (obj.dragging === 2) {
            //         const dragPointerEnd = data.getLocalPosition(obj.parent);
            //         // DRAG
            //         obj.position.set(obj.dragObjStart.x + (dragPointerEnd.x - obj.dragPointerStart.x), obj.dragObjStart.y + (dragPointerEnd.y - obj.dragPointerStart.y));
            //     }
            // }

            // // === CLICKS AND SNAP ===

            // function snap(obj: DragObject) {
            //     obj.position.x = Math.min(Math.max(obj.position.x, 0), app.screen.width);
            //     obj.position.y = Math.min(Math.max(obj.position.y, 0), app.screen.height);
            // }
        };
        setListener();

        const customModelUpdate = () => {
            if (this.model !== null) {
                //口パクのために live2Dmodel.internalModelのアップデート関数を上書きする
                //cubisum4InternalModel https://github.com/guansss/pixi-live2d-display/blob/b51b9cb/src/cubism4/Cubism4InternalModel.ts#L172
                //internalModel https://github.com/guansss/pixi-live2d-display/blob/b51b9cb/src/cubism-common/InternalModel.ts#L252
                const internalModel: PIXILive2D.Cubism4InternalModel = this.model.internalModel as PIXILive2D.Cubism4InternalModel;
                const motionManager: PIXILive2D.MotionManager = this.model.internalModel.motionManager;

                internalModel.update = (dt: DOMHighResTimeStamp, now: DOMHighResTimeStamp): void => {
                    //super.update(dt, now);
                    internalModel.focusController.update(dt); //internalModel.update()と同義　インスタンスの親クラスのメソッドを使う方法探す

                    // cubism4 uses seconds
                    dt /= 1000;
                    now /= 1000;

                    internalModel.emit("beforeMotionUpdate");

                    //--------------------------
                    // if (motionManager.isFinished() === true ) {
                    //     console.log("一連");
                    //     //console.log(motionManager.isFinished(), motionManager.playing);
                    //     console.log(motionManager.state.currentGroup, motionManager.state.currentIndex);
                    // }
                    //モーションが終了時（中断時ではない）ときに実行
                    if (motionManager.isFinished() === true && motionManager.state.currentGroup !== void 0) {
                        this.emit("MotionFinished", motionManager.state.currentGroup, motionManager.state.currentIndex, motionManager.state); //---------------------------------------------------------------------------
                        this.motionFinished = true;
                        //console.log(motionManager.state);
                    }
                    //---------------------------------

                    const motionUpdated = motionManager.update(internalModel.coreModel, now);

                    //------------------------------
                    //前回のモーションが最後まで再生され、今回のモーションが始まったら実行
                    if (this.motionFinished === true && motionManager.playing === true) {
                        //console.log(motionManager.isFinished(), motionManager.playing);
                        this.motionFinished = false;
                        this.emit("MotionStarted", motionManager.state.currentGroup, motionManager.state.currentIndex, motionManager.state);

                        //console.log(motionManager.state.currentGroup, motionManager.state.currentIndex);
                    }
                    //-----------------------------

                    internalModel.emit("afterMotionUpdate");

                    internalModel.coreModel.saveParameters();

                    if (!motionUpdated) {
                        internalModel.eyeBlink?.updateParameters(internalModel.coreModel, dt);
                    }

                    internalModel.updateFocus();

                    // revert the timestamps to be milliseconds
                    internalModel.updateNaturalMovements(dt * 1000, now * 1000);

                    //------------- ここを有効化した
                    //Live2Dmodel.motion()、live2Dmodel.expression()によらないパラメーター操作はここで行う
                    // TODO: Add lip sync API
                    //周期的な口パク
                    if (internalModel.lipSync === true && this.speaking === true) {
                        //console.log("口パク中");
                        const value = Math.abs(Math.sin(2 * Math.PI * this.speakSpeed * now)); // 0 ~ 1

                        internalModel.coreModel.addParameterValueById("ParamMouthOpenY", value, 0.8);
                        //console.log("口："+coreModel.getParameterValueById("ParamMouthOpenY"));
                    }

                    //ボリュームに基づく音声
                    if (internalModel.lipSync === true && this.voicing === true) {
                        //console.log("発話中");
                        internalModel.coreModel.addParameterValueById("ParamMouthOpenY", this.voiceVolume, 0.8);
                    }
                    //-----------

                    internalModel.physics?.evaluate(internalModel.coreModel, dt);
                    internalModel.pose?.updateParameters(internalModel.coreModel, dt);

                    internalModel.emit("beforeModelUpdate");

                    internalModel.coreModel.update();
                    internalModel.coreModel.loadParameters();
                };
            }
        };
        customModelUpdate();
        //console.log(this.model.internalModel.settings);
    }

    /**
     * モデルをデルタフレームでアップデートする関数
     * pixiアプリのtickerに登録する　{pixiapp}.ticker.add({CustomModel}.update)
     * @param {number} deltaFrame デルタフレーム
     */
    update = (deltaFrame: number): void => {
        if (this.model === null) return console.log("モデルがないです");

        //モデルのアップデート
        const frameRate = 60 / deltaFrame; //フレームレートを求める
        const elapsedMs = 1000 / frameRate; //前回からの経過時間を求める
        this.model?.update(elapsedMs);

        if (this.containerScaleX !== this.container.scale.x || this.containerScaleY !== this.container.scale.y) {
            const scaleX = this.container.scale.x / this.containerScaleX;
            const scaleY = this.container.scale.y / this.containerScaleY;

            this.boxWidth = this.boxWidth * scaleX;
            this.boxHeight = this.boxHeight * scaleY;

            this.containerScaleX = this.container.scale.x;
            this.containerScaleY = this.container.scale.y;
        }

        //maskの代わりにフィルターを使う　https://www.html5gamedevs.com/topic/28506-how-to-crophide-over-flow-of-sprites-which-clip-outside-of-the-world-boundaries/
        //voidFilter無いのでAlphaFilterを使う　https://api.pixijs.io/@pixi/filter-alpha/PIXI/filters/AlphaFilter.html
        //見えなくなるだけで当たり判定は存在している

        // const modelBoxGlobal: PIXI.Point = this.modelBox.getGlobalPosition();
        // const filterArea = new PIXI.Rectangle(modelBoxGlobal.x, modelBoxGlobal.y, this.boxWidth, this.boxHeight);

        //-------------------containerで位置調整する場合
        const containerGlobal: PIXI.Point = this.container.getGlobalPosition();
        const filterArea = new PIXI.Rectangle(containerGlobal.x, containerGlobal.y, this.boxWidth, this.boxHeight);
        //filterAreaの位置調整
        filterArea.x -= this.container.pivot.x * this.containerScaleX;
        filterArea.y -= this.container.pivot.y * this.containerScaleY;
        //---------------------------

        this.container.filterArea = filterArea;
        this.filterRectagle = filterArea;

        //マウスを見るかの調整
        if (this.mouseLooking === false) {
            const modelGlobal: PIXI.Point = this.model.getGlobalPosition() as PIXI.Point;
            this.model.focus(modelGlobal.x, modelGlobal.y);
        }

        this.emit("ModelUpdate"); //----------------------------------------------------------------------------------

        // const coreModel: MyCubismModel = this.model.internalModel.coreModel as MyCubismModel;
        //console.log(coreModel.getParameterValueById("ParamMouthOpenY"));

        //現在のモーションの詳細 https://github.com/guansss/pixi-live2d-display/blob/b51b9cb/src/cubism-common/MotionManager.ts#:~:text=state%20%3D%20new%20MotionState()%3B
        //console.log(this.model.internalModel.motionManager.state);

        //現在の表情を特定する方法は不明
        //console.log(this.model.internalModel.motionManager.expressionManager?.expressions);
        //console.log(this.intervalVoiceID)
    };

    /**
     * 移動させたいときはこのメソッドでコンテナを取得して、それを動かす
     * @returns {PIXI.Graphics} モデルの入った箱を返す。
     */
    getContainer = (): PIXI.Container => {
        return this.container;
    };
    getGlobalPosition = () => {
        return this.model?.getGlobalPosition();
    };

    /**
     *
     * @returns {number} 横幅
     */
    getWidth = (): number => {
        return this.boxWidth;
    };

    /**
     *
     * @returns {number} 縦幅
     */
    getHeight = (): number => {
        return this.boxHeight;
    };

    /**
     * モデルの入っている箱を映す
     */
    displayBox = () => {
        this.modelBox.alpha = 1;
    };
    /**
     * モデルの当たり判定エリアをオン
     */
    hitAreaOn = (): void => {
        this.modelHitArea.visible = true;
    };
    /**
     * モデルの当たり判定エリアをオフ
     */
    hitAreaOff = (): void => {
        this.modelHitArea.visible = false;
    };

    // draggable = (model):void => {
    //     model.buttonMode = true;
    //     model.on("pointerdown", (e) => {
    //       model.dragging = true;
    //       model._pointerX = e.data.global.x - model.x;
    //       model._pointerY = e.data.global.y - model.y;
    //     });
    //     model.on("pointermove", (e) => {
    //       if (model.dragging) {
    //         model.position.x = e.data.global.x - model._pointerX;
    //         model.position.y = e.data.global.y - model._pointerY;
    //       }
    //     });
    //     model.on("pointerupoutside", () => (model.dragging = false));
    //     model.on("pointerup", () => (model.dragging = false));
    //   }

    /**
     * タップに反応するかどうかを決めるセッター
     * {CubismModel}.interactive = true;
     * @param {boolean} bool タップに反応するかどうか
     */
    set interactive(bool: boolean) {
        if (this.model === null) return;
        this.model.interactive = bool;
    }

    set idleGroup(groupName: string) {
        if (this.model === null) return;
        this.model.internalModel.motionManager.groups.idle = groupName;
    }

    set audioContext(audioContext: AudioContext) {
        this._audioContext = audioContext;
    }

    set buttonMode(bool: boolean) {
        if (this.model === null) return;
        this.model.buttonMode = bool;
    }

    set draggable(bool: boolean) {
        this._draggable = bool;
    }

    get draggable(): boolean {
        return this._draggable;
    }

    get dragging(): boolean {
        return this._dragging;
    }
    get isSpeaking(): boolean {
        return this.speaking;
    }
    get isVoicing(): boolean {
        return this.voicing;
    }
    get isBoxOn(): boolean {
        return this._isBoxOn;
    }
    get isHit(): boolean {
        return this._isHit;
    }
    get motionState(): PIXILive2D.MotionState | void {
        if (this.model === null) return console.log("モデルがないです");
        return this.model?.internalModel.motionManager.state;
    }
    get settings(): CustomModelSettings | void {
        if (this.model === null) return;
        const settings: CustomModelSettings = this.model.internalModel.settings;
        return settings;
    }

    onHitAreaOver = (listner: (hitAreas: string[]) => void) => {
        this.addListener("HitAreaOver", listner);
    };
    onModelHit = (listner: (hitArea: string) => void) => {
        this.addListener("ModelHit", listner);
    };
    onStartSpeak = (listner: () => void): void => {
        this.addListener("StartSpeak", listner);
    };
    onStopSpeak = (listner: () => void): void => {
        this.addListener("StopSpeak", listner);
    };
    onModelUpdate = (listner: (deltaTime: number) => void) => {
        this.addListener("ModelUpdate", listner);
    };
    onFinishSpeak = (listner: () => void): void => {
        this.addListener("FinishSpeak", listner);
    };
    onMotionFinished = (listner: (currentGroup: string, currentIndex: number, currentMotionState: PIXILive2D.MotionState) => void): void => {
        this.addListener("MotionFinished", listner);
    };
    onMotionStarted = (listner: (currentGroup: string, currentIndex: number, currentMotionState: PIXILive2D.MotionState) => void): void => {
        this.addListener("MotionStarted", listner);
    };

    /**
     * 表情再生
     * @param {number | string } id? 表情の番号または名前、指定しない場合ランダム
     */
    setExpression = (id: number): void => {
        if (this.model === null) return console.log("モデルがないです");
        this.model.expression(id);
        this.currentExpression = id;
    };

    /**
     * モーション再生
     * このクラスでも必ずこれを使う
     * @param {string} group　再生するモーショングループ
     * @param {number} index? 再生するモーションの番号 指定しない場合ランダム
     * @param {MotionPriority} priority? 再生するモーションの優先度 指定しない　場合MotionPriority.NORMAL
     */
    forceMotion = (group: string, index?: number): void => {
        if (this.model === null) return console.log("モデルがないです");

        //モーショングループ名がsettingsにあるか確認
        const settings: CustomModelSettings = this.model.internalModel.settings;
        const motionGroups: string[] = Object.keys(settings.motions as {}[]);
        //ないならキャンセル
        if (motionGroups.includes(group) === false) return console.log(`${group}というMorionGroupは存在しない`);

        //--------------------------------------------
        //モデルにモーションを取らせるとき、表情が反映されないときがある
        //motion()のまえでノーマルの表情に初期化、setTImerで現在の表情をあてはめることで修正できる
        this.model.expression(this.normalExpressionIndex); //表情リセット

        this.model.motion(group, index, PIXILive2D.MotionPriority.FORCE); //モーション再生
        const currentState = this.model.internalModel.motionManager.state;
        this.emit("MotionStarted", currentState.reservedGroup, currentState.reservedIndex, currentState); //---------------------------リスナー

        //初期化した表情を修正
        window.setTimeout(() => {
            if (this.currentExpression !== null) {
                //時間をおいて現在の表情にする
                this.setExpression(this.currentExpression);
            }
        }, 10);
    };

    setFocus = (x: number, y: number): void => {
        this.model?.focus(x, y);
    };

    /**
     * 口パク開始
     * @param {} speakSpeed 口パク速度　2π x speakSpeed
     */
    startSpeak = (speakSpeed: number): void => {
        if (this.model === null || speakSpeed < 0) return console.log("モデルがないです");
        if (speakSpeed < 0) return console.log("無効なspeakSpeed");

        //前の音をとめる
        if (this.voicing === true || this.speaking === true) {
            this.stopSpeak();
        }

        this.speaking = true;

        this.speakSpeed = speakSpeed;

        this.emit("StartSpeak"); //---------------------------------------------
    };

    //audioBufferを受け取って音声を再生し、リアルタイムに「audioBuffer」の音量に応じて口パクする
    startVoice = (audioBuffer: AudioBuffer, frequency?: number) => {
        if (this.model === null) return console.log("モデルがない");
        if (this._audioContext === null) return console.log("AudioContextがない");
        //前の音を止める
        if (this.voicing === true || this.speaking === true) {
            this.stopSpeak();
        }
        this.voicing = true;
        this.emit("StartSpeak"); //----------------------------------------

        const startVoiceTime = this._audioContext.currentTime;
        frequency = frequency ?? 15;
        //AudioCOntextで扱うプレイヤー作成
        this.voiceSource = this._audioContext.createBufferSource();
        // 変換されたバッファーを音源として設定
        this.voiceSource.buffer = audioBuffer; //音源をプレイヤーに設定
        //アナライザー作成
        const analyser: AnalyserNode = this._audioContext.createAnalyser();
        analyser.fftSize = 512; //サンプリングレート

        //プレイヤー→アナライザー→出力
        //プレイヤーをアナライザーにつなげる。
        this.voiceSource.connect(analyser);
        //アナライザーを出力につなげる。
        analyser.connect(this._audioContext.destination);

        //再生終了時にstop()するリスナー登録
        //-------------------------------------------------------ここで登録されたリスナーはAudioSourceNode.stop()時にじっこうさせるので注意
        this.voiceSource.addEventListener("ended", (e: Event) => {
            if (this._audioContext === null || this.voiceSource === null) return console.log("無効なended");
            if (this.voiceSource.buffer === null) return console.log("モデルにAudioBufferがセットされていない");

            //console.log("AudioNodeストップ");
            if (this.voiceSource.buffer?.duration <= this._audioContext.currentTime - startVoiceTime && this.intervalVoiceID !== null) {
                this.emit("FinishSpeak"); //-------------------------------
                this.voicing = false;
                window.clearInterval(this.intervalVoiceID);
            }
        });
        //再生開始
        this.voiceSource.start();

        //解析する
        //ループするリスナー登録
        this.intervalVoiceID = window.setInterval(() => {
            // 一秒あたりfftSize個に分割した音量を取得する
            const timeVolumes = new Uint8Array(analyser.fftSize);
            analyser.getByteTimeDomainData(timeVolumes);
            const currentVolume = normalizeLastVolume(timeVolumes); //音量を0～1に正規化
            this.voiceVolume = currentVolume;

            function normalizeLastVolume(volumes: Uint8Array) {
                // console.log((times[times.length - 1] - ave) / he);
                //値を正規化
                const tmp = (volumes[volumes.length - 1] - Math.min(...volumes)) / (Math.max(...volumes) - Math.min(...volumes));
                //127,128が多ければ無音と考える削除する
                let cnt = 0;
                volumes.forEach((currentValue: number) => {
                    if (currentValue === 127 || currentValue === 128) {
                        cnt += 1;
                    }
                });
                //条件は127,128のかずが半分以下、Nanじゃない、1と0じゃない
                const volume = cnt < (volumes.length - 1) / 2 && isNaN(tmp) !== true && 0 < tmp && tmp < 1 ? tmp : 0;
                return volume;
            }
        }, 1000 / frequency);
    };

    /**
     * 話すのをやめる
     */
    stopSpeak = (): void => {
        if (this.model === null) return console.log("モデルがないです");
        if (this.speaking === false && this.voicing === false) return console.log("話していないので何もしない");
        //
        //前の音を止める
        if (this.voicing === true && this.intervalVoiceID !== null) {
            this.voiceSource?.stop();
            window.clearInterval(this.intervalVoiceID);
            this.intervalVoiceID = null;
        }
        this.speaking = false;
        this.voicing = false;
        this.speakSpeed = 0;
        this.voiceVolume = 0;
        this.emit("StopSpeak"); //---------------------------------------------
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

    // //座標が四角の範囲内にあるかどうかを計算する
    // overModelBox = (point: PIXI.Point): boolean => {
    //     if (point.x >= 0 && point.y >= 0 && point.x <= this.boxWidth && point.y <= this.boxHeight) {
    //         return true;
    //     } else {
    //         return false;
    //     }
    // };
}

// this.model.expression(1);
// this.model.expression("angry1"); //jsonのExpressions.Nameを参照する
//this.model.expression();
//console.log(this.model.internalModel.settings);
//this.model.internalModel.motionManager.groups.idle = "";

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

//     // this.modelBox.scale.set(this.modelBox.scale.x * scaleX, this.modelBox.scale.y * scaleY);
//     //this.model.scale.set(this.model.scale.x * scaleX, this.model.scale.y * scaleY);
//     // console.log(this.modelBox.scale);
//     //this.modelScale = this.modelScale * scaleX;
//     // this.modelX = this.modelX * scaleX;
//     // this.modelY = this.modelY * scaleY;
//     // this.model.position.set(this.boxWidth / 2 + this.modelX, this.boxHeight / 2 + this.modelY);
//     // this.model.scale.set(this.modelScale, this.modelScale);
//     console.log(this.boxHeight, this.boxWidth);
//     console.log(scaleX, scaleY);
//     this.boxWidth = this.modelBox.width;
//     this.boxHeight = this.modelBox.height;
