import * as PIXI from "pixi.js";
import * as PIXILive2D from "pixi-live2d-display";
import { EventEmitter } from "eventemitter3";
import { HitAreaFrames } from "./HitAreaFrames";
import { VOICEVOXAudio } from "./VOICEVOXAudio";

/**
 * ToDo
 * 回転に対応
 * 任意の図形で切り抜けるようにする
 **/
//欠陥：モーションに一意の番号が無いので、予約再生時にモーションを区別できない よってgithubからソースを持ってきてMotionStateが一意のキーを持てるようにする必要がある

//イベント一覧
//onModelHitでモデルをクリックしたときの動作を追加できる。
//onStartSpeakでモデルが話し始めたときの処理を追加できる。
//onStopSpeakでモデルが話し終わる（中断させる）ときの処理を追加できる。
//onModelUpdateでモデルの毎回のアップデートの処理を追加できる。
//onFinishSpeakでボイスが最後まで再生されたときの処理を追加できる。
//onMotionFinishedでモーションが中断されず最後まで再生されたときの処理を追加できる
//onMotionStartedでモーションが開始されたときの処理を追加できる

//model3.jsonファイルで「当たり判定エリア名(HitAreas)」と「あるエリアをタップした時のMotionGoup名」と、を同じにしておく

export class CustomModel extends EventEmitter {
    //public frameContainer: PIXI.Container;
    private container: PIXI.Container; //モデルと枠を格納するコンテナ

    private modelBox: PIXI.Graphics; //モデルの枠＝箱
    private boxWidth: number; //モデルの枠の横幅
    private boxHeight: number; ////モデルの枠の縦幅

    private modelHitArea: HitAreaFrames | PIXI.Graphics; //モデルの当たり判定を表すフレーム

    private audio: VOICEVOXAudio | null; //モデルの発声用のインスタンス

    //モデル関係
    private modelPath: string; //model3.jsonの位置
    private model: (PIXI.Sprite & PIXILive2D.Live2DModel) | null; //Live2DModelインスタンス
    private modelScale: number; //モデルの表示倍率
    //modelBox中心からどれだけずれるかxyで決める
    private modelX: number; //枠の中心からのオフセットx
    private modelY: number; //枠の中心からのオフセットy
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
    // private reservedPriority: string;
    // private reservedIndex: string;

    //モデルがマウスを追うかどうかを決める
    public mouseLooking: boolean;

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
        this._isBoxOn = false;
        this._isHit = false;

        this.speakSpeed = 0;
        this.speaking = false;
        this.voicing = false;
        this.voiceVolume = 0;
        this.audio = null;

        this.currentExpression = null;

        this.normalExpressionIndex = normalExpressionIndex;
        this.mouseLooking = true;

        this.motionFinished = true; //初回はtrueにしておく
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
                //console.log(this.modelX, this.modelY);
                //this.model.position.set(this.modelX, this.modelY);
                this.model.position.set(this.boxWidth / 2 + this.modelX, this.boxHeight / 2 + this.modelY);
                console.log(`このモデルの高さは${this.model.height}、横幅は${this.model.width}`);
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

                const localPosition = e.data.getLocalPosition(e.currentTarget);
                const globalPosition = e.data.global;

                ////modelBoxにマウスが収まっていた時にonModelBox = trueとする
                if (this.overModelBox(localPosition) === true) {
                    this._isBoxOn = true;
                    //hitTestの帰り値は配列
                    if (this.model.hitTest(globalPosition.x, globalPosition.y).length !== 0) {
                        //当たったエリアの配列が帰ってくる
                        //console.log(this.model.hitTest(globalPosition.x, globalPosition.y));
                        this._isHit = true;
                        this.model.buttonMode = true;
                        //console.log("乗った");
                    } else {
                        this._isHit = false;
                        this.model.buttonMode = false;
                    }
                } else {
                    this._isHit = false;
                    this.model.buttonMode = false;
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
                        internalModel.coreModel.addParameterValueById("ParamMouthOpenY", this.voiceVolume, 0.9);
                    }
                    //-----------

                    internalModel.physics?.evaluate(internalModel.coreModel, dt);
                    internalModel.pose?.updateParameters(internalModel.coreModel, dt);

                    internalModel.emit("beforeModelUpdate");

                    internalModel.coreModel.update();
                    internalModel.coreModel.loadParameters();
                    //console.log("updateしてる");
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
            const filterArea = new PIXI.Rectangle(containerGlobal.x, containerGlobal.y, this.boxWidth, this.boxHeight);
            filterArea.x -= this.container.pivot.x;
            filterArea.y -= this.container.pivot.y;
            this.container.filterArea = filterArea;

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
        } else {
            console.log("nullモデルアップデート");
        }
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

    //座標が四角の範囲内にあるかどうかを計算する
    overModelBox = (point: PIXI.Point): boolean => {
        if (point.x >= 0 && point.y >= 0 && point.x <= this.boxWidth && point.y <= this.boxHeight) {
            return true;
        } else {
            return false;
        }
    };

    /**
     * 移動させたいときはこのメソッドでコンテナを取得して、それを動かす
     * @returns {PIXI.Container} モデルの入った箱を返す。
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

    setVOICEVOXvoice = (audio: VOICEVOXAudio): void => {
        this.audio = audio;
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
    startVoice = async (speaker: number, text: string, volumeScale?: number) => {
        if (this.model === null) return console.log("モデルがない");
        if (this.audio === null) return console.log("audioがない");
        //前の音を止める
        if (this.voicing === true || this.speaking === true) {
            this.stopSpeak();
        }
        this.voicing = true;

        const audioBuffer: AudioBuffer = await this.audio.createVoice(speaker, text, volumeScale);
        const setVoiceVolume = (volume: number): void => {
            this.voiceVolume = volume;
        };
        const onVoiceStop = (): void => {
            this.emit("FinishSpeak"); //-------------------------------
            this.voicing = false;
        };
        this.audio.playVoice(audioBuffer, true, setVoiceVolume, 15, onVoiceStop); //this.stopSpeakを登録しない、endedでspeaking,voicing両方falseになるため
        this.emit("StartSpeak"); //----------------------------------------

        //startVoiceを再生中にstartVoiceすると 次のstartVoiceのvoicing = true の後
        //前のstartVoiceのonVoiceStopが実行されて、voicing = falseになってしまう
        //よって数十ms後にvoicingをtrueにする。
        window.setTimeout(() => {
            if (this.voicing === true) return;
            this.voicing = true;
        }, 10);
    };

    /**
     * 話すのをやめる
     */
    stopSpeak = (): void => {
        if (this.model === null) return console.log("モデルがないです");
        if (this.speaking === false && this.voicing === false) return console.log("話していないので何もしない");
        //
        //前の音を止める
        if (this.audio?.isPlaying === true) {
            this.audio.stopVoice();
        }
        this.speaking = false;
        this.voicing = false;
        this.speakSpeed = 0;
        this.voiceVolume = 0;
        this.emit("StopSpeak"); //---------------------------------------------
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
