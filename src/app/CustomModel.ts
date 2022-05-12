import * as PIXI from "pixi.js";
import * as PIXILive2D from "pixi-live2d-display";
import { EventEmitter } from "eventemitter3";
import { HitAreaFrames } from "./HitAreaFrames";

//ドラッグに対応するための型を作成
interface DragObject extends PIXI.DisplayObject {
    dragging: boolean;
}

//設定ファイルの定義を拡張
interface CustomModelSettings extends PIXILive2D.ModelSettings {
    expressions?: any[];
    groups?: any[];
    hitAreas?: any[];
    layout?: any;
    motions?: any[];
}

//現在のエージェントの話状態を表す
const SpeakState = {
    Noting: "Noting",
    Speaking: "Speaking",
    Voicing: "Voicing",
} as const;
type SpeakState = typeof SpeakState[keyof typeof SpeakState];

/**
 * ToDo
 * 回転に対応
 * 任意の図形で切り抜けるようにする
 **/
//欠陥：モーションに一意の番号が無いので、予約再生時にモーションを区別できない よってgithubからソースを持ってきてMotionStateが一意のキーを持てるようにする必要がある
//motion(group,number,force)で同じモーションは重ねて再生できない、なのでmotion()のまえにstopAllmotionを入れる必要がある;

//音を再生させたいとき
//1.{CustomModel}.audioContext = {AudioContext} で設定
//2,{CustomModel}.startSpeak({AudioBuffer}) で発声に合わせて口パクできる

//イベント一覧
//onHitAreaOverでモデルの当たり判定エリアにマウスが乗ったときの動作を追加できる
//onModelHitでモデルをクリックしたときの動作を追加できる。
//onStartSpeakでモデルが話し始めたときの処理を追加できる。
//onStopSpeakでモデルが話し終わる（中断させる）ときの処理を追加できる。
//onModelUpdateでモデルの毎回のアップデートの処理を追加できる。
//onFinishSpeakでボイスが最後まで再生されたときの処理を追加できる。
//onMotionFinishedでモーションが中断されず最後まで再生されたときの処理を追加できる
//onMotionStartedでモーションが開始されたときの処理を追加できる
//onExpressionSettedで表情を設定したときの処理を追加できる

export class CustomModel extends EventEmitter {
    //モデルがマウスを追うかどうかを決める
    public mouseLooking: boolean;

    public container: PIXI.Container; //モデルと枠を格納するコンテナ
    private containerScaleX: number; //コンテナの大きさ倍率x
    private containerScaleY: number; //コンテナの大きさ倍率y
    private containerAngle: number;

    private modelBox: PIXI.Graphics; //モデルの枠＝箱
    private boxWidth: number; //モデルの枠の横幅
    private boxHeight: number; ////モデルの枠の縦幅

    private filterRectagle: PIXI.Rectangle;

    private modelHitArea: HitAreaFrames | PIXI.Graphics; //モデルの当たり判定を表すフレーム

    //モデル関係
    private modelPath: string; //model3.jsonの位置
    private model: (PIXI.Sprite & PIXILive2D.Live2DModel) | null; //Live2DModelインスタンス
    private modelScaleX: number; //モデルの表示倍率
    private modelScaleY: number;
    //modelBox中心からどれだけずれるかxyで決める
    private modelX: number; //枠の中心からのオフセットx
    private modelY: number; //枠の中心からのオフセットy

    //当たり判定関係
    private _isBoxOn: boolean; //エージェントの箱の上に乗っているか＝視線追従の基準、モデルタップの前提条件
    private _isHit: boolean; //モデルとマウスの当たり判定が生じているかどうか＝hitイベントの時の発火基準

    //発声関係
    private speakState: SpeakState;
    private speakSpeed: number; //モデルの口パクスピード | 2π x speakSpeed x t | で用いる
    private voiceVolume: number; //モデルの音量

    //表情関係
    private currentExpression: number | string | null;
    private normalExpressionIndex: number | string;

    //モーション関係
    private motionFinished: boolean; //モデルが前のフレームでアップデートされていたかどうか
    private _dragging: boolean; //drag中であるかを表す
    private _draggable: boolean; //このモデルをドラッグできるようにするかを決める
    // private reservedPriority: string;
    // private reservedIndex: string;

    //音声再生関係;
    private _audioContext: AudioContext | null; //AudioContext
    private voiceSource: AudioBufferSourceNode | null; //受け取ったaudioBufferをセットするAudioBufferSourceNode

    /**
     *モデルの設定の初期化
     * @param {string} modelPath モデルのパス(~~/hoge.model3.json)を指定する
     * @param {number}boxWidth モデルを入れる箱の横幅
     * @param {number}boxHeight 縦幅
     * @param {number}modelScale 箱の中のモデルの拡大率
     * @param {number}modelX 箱の中のモデルが中心から
     * @param {number}modelY
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
        this.containerAngle = 0;
        this.modelBox = new PIXI.Graphics();
        this.modelBox.beginFill(0xffff99).drawRect(0, 0, this.boxWidth, this.boxHeight).endFill();
        this.modelBox.pivot.set(this.boxWidth / 2, this.boxHeight / 2);
        this.modelBox.position.set(this.boxWidth / 2, this.boxHeight / 2);
        this.modelBox.alpha = 0;
        this.container.addChild(this.modelBox);

        this.modelHitArea = new HitAreaFrames();

        this.modelPath = modelPath;
        this.model = null;
        // let model: PIXILive2D.Live2DModel;
        // model.on = (await PIXILive2D.Live2DModel.from(this.modelPath))
        this.modelScaleX = modelScale ?? 1;
        this.modelScaleY = modelScale ?? 1;
        this.modelX = modelX ?? 0;
        this.modelY = modelY ?? 0;

        this._isBoxOn = false;
        this._isHit = false;

        this.speakState = SpeakState.Noting;
        this.speakSpeed = -1;
        this.voiceVolume = -1;

        this.currentExpression = null;
        this.normalExpressionIndex = normalExpressionIndex;

        this.motionFinished = true; //初回はtrueにしておく
        this._dragging = false;
        this._draggable = false;

        this.mouseLooking = true;

        this._audioContext = null;
        this.voiceSource = null;
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
                this.model.scale.set(this.modelScaleX, this.modelScaleY);

                this.model.position.set(this.boxWidth / 2 + this.modelX, this.boxHeight / 2 + this.modelY);
                //console.log(`このモデルの高さは${this.model.height}、横幅は${this.model.width}`);
                this.modelHitArea.visible = false;
                this.model?.addChild(this.modelHitArea);
                this.container.addChild(this.model);
            }
        };
        setPosition();

        const setListener = () => {
            if (this.model === null) {
                throw new Error("モデルがない");
            }

            this.container.interactive = true;

            //マウスが動いた時のリスナー登録
            this.container.on("mousemove", (e: PIXI.InteractionEvent) => {
                if (this.model === null) {
                    throw new Error("モデルがない");
                }
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

            //ドラッ時の処理を追加
            let offsetX: number | null;
            let offsetY: number | null;
            const onDragStart = (event: PIXI.InteractionEvent): void => {
                // store a reference to the data
                // the reason for this is because of multitouch
                // we want to track the movement of this particular touch

                //this._draggable = false　なら実行しない
                if (this._isBoxOn === false || this._draggable === false) return;
                const target: DragObject = event.currentTarget as DragObject;

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

                    offsetX = null;
                    offsetY = null;
                }
            };

            const onDragMove = (event: PIXI.InteractionEvent): void => {
                const target: DragObject = event.currentTarget as DragObject;
                if (target.dragging === true && target.dragging !== void 0 && offsetX !== null && offsetY !== null) {
                    this._dragging = true;
                    target.alpha = 0.5;
                    this.container.filters = [new PIXI.filters.AlphaFilter(0.5)];
                    const newPosition = event.data.getLocalPosition(target.parent);
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

        // const customMotionUpdate = () => {
        //     if (this.model != null) {
        //         const internalModel: PIXILive2D.Cubism4InternalModel = this.model.internalModel as PIXILive2D.Cubism4InternalModel;
        //         const motionManager: PIXILive2D.Cubism4MotionManager = this.model.internalModel.motionManager as PIXILive2D.Cubism4MotionManager;
        //         motionManager.update = (model: object, now: DOMHighResTimeStamp): boolean => {
        //             if (motionManager.isFinished()) {
        //                 if (motionManager.playing) {
        //                     motionManager.playing = false;
        //                     motionManager.emit("motionFinish");

        //                 }

        //                 if (motionManager.state.shouldOverrideExpression()) {
        //                     motionManager.expressionManager?.restoreExpression();
        //                 }

        //                 motionManager.state.complete();

        //                 if (motionManager.state.shouldRequestIdleMotion()) {
        //                     // noinspection JSIgnoredPromiseFromCall
        //                     motionManager.startRandomMotion(motionManager.groups.idle, PIXILive2D.MotionPriority.IDLE);
        //                 }
        //             }

        //             let updated = motionManager.queueManager.doUpdateMotion(internalModel.coreModel, now);

        //             updated = motionManager.expressionManager?.update(model, now) || updated;

        //             return updated;
        //         };
        //     }
        // };
        // customMotionUpdate();

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
                    if (internalModel.lipSync === true && this.speakState === SpeakState.Speaking) {
                        //console.log("口パク中");
                        const value = Math.abs(Math.sin(2 * Math.PI * this.speakSpeed * now)); // 0 ~ 1

                        internalModel.coreModel.addParameterValueById("ParamMouthOpenY", value, 0.8);
                        //console.log("口："+coreModel.getParameterValueById("ParamMouthOpenY"));
                    }
                    //ボリュームに基づく音声
                    else if (internalModel.lipSync === true && this.speakState === SpeakState.Voicing) {
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
        if (this.model === null) {
            throw new Error("モデルがないです");
        }

        //モデルのアップデート
        const frameRate = 60 / deltaFrame; //フレームレートを求める
        const deltaMs = 1000 / frameRate; //前回からの経過時間を求める
        this.model?.update(deltaMs);

        //拡大縮小回転に対応
        if (this.containerScaleX !== this.container.scale.x || this.containerScaleY !== this.container.scale.y || this.containerAngle !== this.container.angle) {
            //コンテナの現在の倍率：変わる前の倍率を求める
            const currentExRateX = this.container.scale.x / this.containerScaleX;
            const currentExRateY = this.container.scale.y / this.containerScaleY;

            //フィルター用のrentagleに使っている大きさを更新
            this.boxWidth = this.boxWidth * currentExRateX;
            this.boxHeight = this.boxHeight * currentExRateY;

            //※使用していない。　一応モデルの倍率を更新
            this.modelScaleX = this.modelScaleX * currentExRateX;
            this.modelScaleY = this.modelScaleY * currentExRateY;

            //containerの回転に対応
            this.modelBox.angle = -this.container.angle;

            //現在のコンテナの倍率を記憶
            this.containerScaleX = this.container.scale.x;
            this.containerScaleY = this.container.scale.y;
            this.containerAngle = this.container.angle;
        }

        //アルファフィルターでモデルをカット
        //maskの代わりにフィルターを使う　https://www.html5gamedevs.com/topic/28506-how-to-crophide-over-flow-of-sprites-which-clip-outside-of-the-world-boundaries/
        //voidFilter無いのでAlphaFilterを使う　https://api.pixijs.io/@pixi/filter-alpha/PIXI/filters/AlphaFilter.html
        //見えなくなるだけで当たり判定は存在している
        //------------------modelBoxで位置調整する場合
        const modelBoxGlobal: PIXI.Point = this.modelBox.getGlobalPosition();
        const filterArea = new PIXI.Rectangle(modelBoxGlobal.x, modelBoxGlobal.y, this.boxWidth, this.boxHeight);
        //filterAreaの位置調整
        filterArea.x -= this.boxWidth / 2;
        filterArea.y -= this.boxHeight / 2;
        //------------------
        // //-------------------containerで位置調整する場合
        // const containerGlobal: PIXI.Point = this.container.getGlobalPosition();
        // const filterArea = new PIXI.Rectangle(containerGlobal.x, containerGlobal.y, this.boxWidth, this.boxHeight);
        // //filterAreaの位置調整
        // filterArea.x -= this.container.pivot.x * this.containerScaleX;
        // filterArea.y -= this.container.pivot.y * this.containerScaleY;
        // //---------------------------
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
     *横幅取得
     * @returns {number} 横幅
     */
    getWidth = (): number => {
        return this.boxWidth;
    };

    /**
     *縦幅取得
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

    /**
     * モデルのアイドル時のモーショングループを設定
     */
    set idleGroup(groupName: string) {
        if (this.model === null) return;
        this.model.internalModel.motionManager.groups.idle = groupName;
    }

    /**
     * モデルの音声再生に使うAudioContextを設定
     * これを設定しないと発声できない
     */
    set audioContext(audioContext: AudioContext) {
        this._audioContext = audioContext;
    }

    /**
     * モデルのボタンモードのオンオフ設定
     */
    set buttonMode(bool: boolean) {
        if (this.model === null) return;
        this.model.buttonMode = bool;
    }

    /**
     * モデルをドラッグできるか設定
     */
    set draggable(bool: boolean) {
        this._draggable = bool;
    }

    /**
     * 現在のドラッグ設定を返す
     */
    get draggable(): boolean {
        return this._draggable;
    }

    /**
     * 今現在モデルがドラッグされている最中かを返す
     */
    get dragging(): boolean {
        return this._dragging;
    }

    /**
     * 今現在モデルが口パクしているかを返す
     */
    get isSpeaking(): boolean {
        return this.speakState === SpeakState.Speaking ? true : false;
    }

    /**
     * 今現在モデルが発声しているかを返す
     *
     */
    get isVoicing(): boolean {
        return this.speakState === SpeakState.Voicing ? true : false;
    }
    /**
     * 今現在マウスが箱の上に乗っているかを返す
     */
    get isBoxOn(): boolean {
        return this._isBoxOn;
    }

    /**
     * 今現在マウスがモデルのヒットテスト領域に乗っているかを表す
     */
    get isHit(): boolean {
        return this._isHit;
    }

    /**
     * 今現在のモデルのモーション状態を返す
     */
    get motionState(): PIXILive2D.MotionState | void {
        if (this.model === null) {
            throw new Error("モデルがないです");
        }
        return this.model?.internalModel.motionManager.state;
    }

    /**
     * モデルの設定（model3.json）を返す;
     */
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
    onExpressionSetted = (listner: (id: number | string) => void) => {
        this.addListener("ExpressionSetted", listner);
    };

    /**
     * 表情を設定
     * @param {number | string } id? 表情の番号または名前、指定しない場合ランダム
     */
    setExpression = (id: number | string): void => {
        if (this.model === null) {
            throw new Error("モデルがないです");
        }
        //表情名がsettingsにあるか確認
        const settings: CustomModelSettings = this.model.internalModel.settings;
        const expressions: string[] = (settings.expressions as Object[]).map((currentValue) => {
            return (currentValue as { Name: string; File: string }).Name;
        });
        //ないならキャンセル
        if (typeof id === "number") {
            if (expressions.length - 1 < id || id < 0) {
                {
                    throw new Error(`「${id}番目」の表情は存在しません。`);
                }
            }
        } else if (typeof id === "string") {
            if (expressions.includes(id as string) === false) {
                throw new Error(`「${id}」という表情は存在しません。`);
            }
        }

        //表情反映
        this.model.expression(id);
        this.currentExpression = id;
        this.emit("ExpressionSetted", id);
    };

    /**
     * モーションを強制的に再生
     * このクラスでも必ずこれを使う
     * @param {string} group　再生するモーショングループ
     * @param {number} index? 再生するモーションの番号 指定しない場合ランダム
     */
    forceMotion = (group: string, index?: number | undefined): void => {
        if (this.model === null) {
            throw new Error("モデルがないです");
        }

        //モーショングループ名とindexがsettingsにあるか確認
        const settings: CustomModelSettings = this.model.internalModel.settings;
        const motionGroups: string[] = Object.keys(settings.motions as {}[]);
        const moitonIndexes: Object[] = settings.motions !== void 0 ? settings.motions[group as any] : null;
        //モーショングループがないならキャンセル
        if (motionGroups.includes(group) === false) {
            throw new Error(`「${group}」というMorionGroupは存在しない`);
        }
        //モーションがundefiedではなく数値の時insexが違反ならキャンセル
        if (index !== void 0) {
            if (moitonIndexes.length - 1 < index || index < 0) {
                throw new Error(`${group}に「${index}」番目のモーションはありません。`);
            }
        }

        //--------------------------------------------
        //モデルにモーションを取らせるとき、表情が反映されないときがある
        //motion()のまえでノーマルの表情に初期化、setTImerで現在の表情をあてはめることで修正できる
        this.model.expression(this.normalExpressionIndex); //表情リセット

        this.stopMotions(); //----------------------------------------------これでモーションを止める必要がある
        this.model.motion(group, index, PIXILive2D.MotionPriority.FORCE); //モーション再生
        const currentState = this.model.internalModel.motionManager.state;

        this.emit("MotionStarted", currentState.reservedGroup, currentState.reservedIndex, currentState); //---------------------------リスナー

        //初期化した表情を修正
        window.setTimeout(() => {
            if (this.currentExpression !== null) {
                //時間をおいて現在の表情にする
                this.model?.expression(this.currentExpression);
            }
        }, 10);
    };

    /**
     * モーションを強制的に止める
     */
    stopMotions = (): void => {
        if (this.model === null) {
            throw new Error("モデルがないです");
        }

        this.model.internalModel.motionManager.stopAllMotions();
    };

    /**
     *
     * @param {number} x グローバルなマウスの位置x
     * @param {number} y グローバルなマウスの位置y
     */
    setFocus = (x: number, y: number): void => {
        if (this.model === null) {
            throw new Error("モデルがないです");
        }
        this.model.focus(x, y);
    };

    /**
     * 口パク開始
     * @param {} speakSpeed 口パク速度　2π x speakSpeed
     */
    startSpeak = (speakSpeed: number): void => {
        if (this.model === null || speakSpeed < 0) {
            throw new Error("モデルがないです");
        }
        if (speakSpeed < 0) {
            throw new Error("無効なspeakSpeed");
        }

        //前の音をとめる
        if (this.speakState === SpeakState.Voicing) {
            this.stopSpeak();
        }

        this.speakState = SpeakState.Speaking;

        this.speakSpeed = speakSpeed;

        this.emit("StartSpeak"); //---------------------------------------------
    };

    /**
     * AudioBufferを受け取って音声を再生し、リアルタイムにAudioBufferの「波形」に応じて口パクする
     * @param {pixiApp} pixiApp モデルを設置しているPIXI.Application
     * @param {AudioBuffer} audioBuffer 再生したい音
     * @param {number} frequency 一秒あたり何度解析するか=一秒間に何回口の大きさを変更するか
     */

    startVoice = (pixiApp: PIXI.Application, audioBuffer: AudioBuffer, frequency?: number) => {
        if (this.model === null) {
            throw new Error("モデルがない");
        }
        if (this._audioContext === null) {
            throw new Error("AudioContextがない");
        }

        //前の音を止める
        if (this.voiceSource !== null) {
            this.voiceSource.stop(); //ended関数実行
            this.voiceSource = null;
        }
        this.speakSpeed = 0;
        this.speakState = SpeakState.Voicing;
        this.emit("StartSpeak"); //----------------------------------------

        const startVoiceTime = this._audioContext.currentTime;

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

        //解析する
        //ループするリスナー関数の設定関数（クロージャー関数）
        const tickerListnerSetting = () => {
            let accumulatedMs = 0; //蓄積時間

            const tickerListner = (deltaFrame: number) => {
                frequency = frequency ?? 15; //解析する頻度;
                const frameRate = 60 / deltaFrame; //フレームレートを求める
                const deltaMs = 1000 / frameRate; //前回からの経過時間を求める
                accumulatedMs += deltaMs;
                if (accumulatedMs >= 1000 / frequency) {
                    //console.log(accumulatedMs + "で実行");
                    accumulatedMs = 0; //蓄積時間を0にする

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
                }
            };

            return tickerListner;
        };
        const settedTickerListner = tickerListnerSetting(); //クロージャーで関数に状態を持たせる
        pixiApp.ticker.add(settedTickerListner); //tikcerに加える＝毎フレーム処理されるようになる

        //{AudioSource}.stop()が呼ばれたときか、最後まで{AudioSource}が流れたときに呼ばれるリスナー
        const voiceSourceListner = (e: Event) => {
            if (this._audioContext === null || this.voiceSource === null) {
                throw new Error("無効なended");
            }
            if (this.voiceSource.buffer === null) {
                throw new Error("モデルにAudioBufferがセットされていない");
            }

            //最後まで話したときのみ実行;
            if (this.voiceSource.buffer?.duration <= this._audioContext.currentTime - startVoiceTime) {
                this.emit("FinishSpeak"); //-------------------------------
                this.speakState = SpeakState.Noting;
            }

            //最後まで話していても話していなくてもする処理
            pixiApp.ticker.remove(settedTickerListner);
            this.voiceVolume = 0;
        };

        //再生終了時にstop()するリスナー登録
        //-------------------------------------------------------ここで登録されたリスナーはAudioSourceNode.stop()時にじっこうされるので注意
        this.voiceSource.addEventListener("ended", voiceSourceListner);
        //再生開始
        this.voiceSource.start();
    };

    /**
     * 口パク・発声をやめる
     */
    stopSpeak = (): void => {
        if (this.model === null) {
            throw new Error("モデルがないです");
        }
        if (this.speakState === SpeakState.Noting) {
            console.log("口パク・発声していないので何もしない");
            return;
        }
        //
        //前の音を止める
        if ((this.speakState = SpeakState.Voicing)) {
            //音声再生時の処理はended関数で実行している。
            this.voiceSource?.stop();
        }
        this.speakState = SpeakState.Noting;
        this.speakSpeed = 0;
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
