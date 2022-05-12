import * as PIXI from "pixi.js";
//import * as PIXILive2D from "pixi-live2d-display";
import { CustomModel } from "./CustomModel";
import { Range } from "./Elements";
import { Client, Query } from "voicevox-api-client";
import { ModelPosition } from "./types";
//import { threadId } from "worker_threads";
// declare global {
//     interface Window {
//         PIXI: any;
//     }
// }

//pixiアプリケーションのオプション
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
    private pixiApp: PIXI.Application; //アプリ
    public hiyori: CustomModel; //Live2Dモデル
    private audioContext: AudioContext; //音声再生機
    private voicevoxClient: Client | null; //VOICEVOXサーバークライアント
    private debug: boolean; //デバッグをするかしないか

    //private serverConnect: boolean;
    //使うものを列挙する
    constructor(debug: boolean, serverConnect: boolean, serverURL: string, modelPath: string, modelPosition: ModelPosition) {
        this.debug = debug;
        //window.PIXI = PIXI;
        // PIXI.Application.registerPlugin(PIXI.TickerPlugin);
        // Live2DModel.registerTicker(PIXI.Ticker);

        //アプリ作成
        //オプション　https://pixijs.download/release/docs/PIXI.Application.html
        const pixiOptions: IApplicationOptions = {
            width: 1000,
            height: 1000,
            view: document.getElementById("myCanvas") as HTMLCanvasElement,
            backgroundColor: debug === true ? 0x000099 : void 0,
            resolution: window.devicePixelRatio || 1,
            //autoDensity: true,
            transparent: debug === true ? false : true, //http://runstant.com/pentamania/projects/82dc0e31
        };
        this.pixiApp = new PIXI.Application(pixiOptions);
        //const uxStage = new PIXI.Stage

        this.audioContext = new AudioContext();

        //モデルを初期化
        //550, 900, 0.235, 0, -20 モデル全身/
        //550, 700, 0.45, 0, 500 モデル顔中心
        //225, 350, 0.25, 0, 250
        //("/Resources/Hiyori_2/Hiyori.model3.json");
        this.hiyori = new CustomModel(modelPath, "normal1", modelPosition.boxWidth, modelPosition.boxHeight, modelPosition.modelScale, modelPosition.modelX, modelPosition.modelY);
        if (serverConnect === true && serverURL !== void 0) {
            //http://localhost:40080
            //http://192.168.3.10:40080
            this.voicevoxClient = new Client(serverURL);
            this.hiyori.audioContext = this.audioContext;
            this.testConnect();
        } else {
            this.voicevoxClient = null;
        }
    }

    //サーバー接続をテストする
    testConnect = async () => {
        if (this.voicevoxClient === null) return;
        const query: Query = await this.voicevoxClient.query.createQuery(0, "テストテスト");
        const voiceArrayBuffer: ArrayBuffer = await this.voicevoxClient.voice.createVoice(0, query);
        // Web Audio APIで使える形式に変換
        const voiceAudioBufer: AudioBuffer = await this.audioContext.decodeAudioData(voiceArrayBuffer); //「ArrayBuffer」を「AudioBuffer」に変換
        console.log("サーバ応答テスト完了");
    };

    //ロード処理と初期配置を書く
    initialize = async () => {
        const stage = this.pixiApp.stage; //PIXIJSのステージを取得

        //-----------------------------------------------------モデルの設定
        await this.hiyori.makeModel(); //非同期で作成するので待機

        const hiyoriModel = this.hiyori.getContainer(); //ひよりを格納しているPIXI.Containerを取得する。

        hiyoriModel.pivot.set(this.hiyori.getWidth() / 2, this.hiyori.getHeight() / 2);
        hiyoriModel.x = 500;
        hiyoriModel.y = 500;
        //hiyoriModel.angle = 45;
        //hiyoriModel.scale.set(1.25, 1.25);
        // const dai = new PIXI.Graphics();
        // dai.beginFill(0xcc0000).drawRect(0, 0, 500, 500).endFill();
        // dai.x = 100;
        // dai.y = 100;
        // dai.addChild(hiyoriModel);
        // stage.addChild(dai);
        stage.addChild(hiyoriModel);
        //デバッグすらならモデルの収まっている四角形とHitAreaを表示
        if (this.debug === true) {
            this.hiyori.displayBox();
            this.hiyori.hitAreaOn();
        }
        //this.hiyori.hitAreaOff();
        this.hiyori.idleGroup = "Idle"; //ひよりの通常時のモーショングループ
        this.hiyori.draggable = true; //ひよりをドラッグできる

        //リスナー登録していく
        //モデルをタップした時の動作を追加
        this.hiyori.onModelHit((hitArea: string) => {
            //体に当たったときのみ反応
            if (hitArea === "Body") {
                //話している最中はタッチに反応しない
                if (this.hiyori.isSpeaking === false && this.hiyori.isVoicing === false) {
                    this.hiyori.forceMotion("TapBody", void 0); //モーション再生
                    console.log("モデルヒット：" + hitArea);
                }
            }
        });
        //マウスがモデルのHitArea上で動いた時
        this.hiyori.onHitAreaOver((hitAreas: string[]) => {
            //console.log(hitAreas);
        });
        //モデルが話始めたときの処理
        this.hiyori.onStartSpeak(() => {
            this.hiyori.forceMotion("StartSpeak", void 0);
            this.hiyori.idleGroup = "StartSpeak";
            console.log("口パク、または発話始め。");
        });
        //モデルの口パクボイスを中断したときの処理
        this.hiyori.onStopSpeak(() => {
            this.hiyori.idleGroup = "Idle";
            console.log("口パク、または発話中断");
        });
        //モデルのアップデート処理時に実行される。
        this.hiyori.onModelUpdate(() => {
            //console.log(this.hiyori.isBoxOn);
            //マウスを見るかの調整
            if (this.hiyori.isBoxOn === false) {
                this.hiyori.mouseLooking = false;
            } else {
                this.hiyori.mouseLooking = true;
            }

            //モデルの当たり判定が発生しているとき　buttonmode = true
            if (this.hiyori.isHit === true) {
                this.hiyori.buttonMode = true;
            } else {
                this.hiyori.buttonMode = false;
            }

            //ドラッグしているとき
            // if (this.hiyori.draggable === true && this.hiyori.isBoxOn === true) {
            //     //console.log(this.hiyori.buttonMode);
            //     this.hiyori.buttonMode = true;
            // }

            //console.log(this.hiyori.isSpeaking, this.hiyori.isVoicing);
            //console.log(this.hiyori.motionState);
        });
        //話し終わったときの処理
        this.hiyori.onFinishSpeak(() => {
            this.hiyori.idleGroup = "Idle";
            console.log("発話最後まで終了");
        });
        //モーションが最後まで再生されたときの処理
        this.hiyori.onMotionFinished((currentGroup: string, currentIndex: number) => {
            console.log(`「${currentGroup}」グループの、「${currentIndex}」番目のモーションが終了`);
        });
        //モーションが始まったときの処理。
        this.hiyori.onMotionStarted((currentGroup: string, currentIndex: number) => {
            console.log(`「${currentGroup}」グループの、「${currentIndex}」番目のモーションが開始`);
        });
        //モデルの表情が変更されたときの処理
        this.hiyori.onExpressionSetted((id: string | number) => {
            if (typeof id === "string") {
                console.log(`「${id}」という表情に切り替え。`);
            }
            if (typeof id === "number") {
                console.log(`「${id}番目」の表情に切り替え。`);
            }
        });
        //---------------------------------------------------------------------

        //---------------回転スライダーの設定
        const range = new Range(600, 30, 360, 0);
        stage.addChild(range.range);
        range.range.x = 500;
        range.range.y = 965;
        //range.range.angle = 45;
        range.addEventListener("change", () => {
            //console.log(range.step);
            hiyoriModel.angle = range.step;
            //console.log(hiyoriModel.angle)
        });
        //------------------------------

        // // 角丸四角形を描く
        // const roundBox = new PIXI.Graphics();
        // roundBox.lineStyle(4, 0x555555, 1);
        // roundBox.beginFill(0x777777);
        // // drawRoundedRect(x, y, width, height, cornerRadius)
        // roundBox.drawRoundedRect(0, 0, 500, 50, 20);
        // roundBox.endFill();
        // // // 位置（四角の左上が基準として）
        // roundBox.x = 400;
        // roundBox.y = 0;
        // stage.addChild(roundBox);

        // // 円形を描く
        // const circle = new PIXI.Graphics();
        // circle.beginFill(0x00bfff);
        // // drawCircle(x, y, radius半径)
        // circle.drawCircle(0, 0, 30);
        // circle.endFill();
        // // 位置（円の中心が基準として）
        // circle.x = 400;
        // circle.y = 0;
        // stage.addChild(circle);

        // //2*circle - roundbox

        // console.log("bunny1:", roundBox.x, roundBox.y);
        // console.log("bunny2:", circle.x, circle.y);
        // console.log(roundBox.toLocal(circle.position).x, roundBox.toLocal(circle.position).y);

        //時間経過で必要になる処理を加えていく
        const addUpdate = () => {
            this.pixiApp.ticker.add(this.hiyori.update); //tickerにLive2Dモデルのアップデートを加える。
            // this.pixiApp.ticker.add((deltaFrame: number) => {
            //     hiyoriModel.angle += (360 / 600) * deltaFrame;
            // });
            // if (this.hiyori.model != null) {
            //     //this.pixiApp.ticker.add(() => this.hiyori?.model?.update(this.pixiApp.ticker.elapsedMS));
            //     // this.pixiApp.ticker.add((delta) => {
            //     //     //console.log(params);
            //     //     //deltaとelapsedmsの違い　https://www.html5gamedevs.com/topic/36268-pixiticker-deltatime-vs-elapsedms/
            //     //     console.log("デルタ:" + delta); //1秒間に60FPSを基準として前回のフレームから何フレーム分更新したか、60fpsでのフレーム単位の処理を書く 1Frame /(144FPS / 60FPS) = 0.42Frame
            //     //     console.log(this.pixiApp.ticker.elapsedMS); //前回のフレームから何ms更新したか 1000ms/ 144 = 7ms、ミリ秒単位の処理を書く
            //     // });
            // }
        };
        addUpdate();
        //const widget = new PIXI.
        // const food: PIXI.Sprite = PIXI.Sprite.from("/Resources/foodImgs/0002_カレー.jpg");
        // this.pixiApp.stage.addChild(food);
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
        // this.pixiApp.stage.addChild(model);
        // transforms
        // model.x = 500;
        // model.y = 500;
        // model.rotation = Math.PI;
        // model.skew.x = Math.PI;
        // model.scale.set(0.25, 0.25);
        // model.anchor.set(0.5, 0.5);
        //動く
        //これを大本でtickeradd(this.hiyori.update)のようにする
        // this.pixiApp.ticker.add(() => {
        //     model.update(this.pixiApp?.ticker.elapsedMS as number);
        //     //console.log(this.pixiApp?.ticker.elapsedMS);
        // });
        // const ticker = new PIXI.Ticker();
        // ticker.add(() => model.update(ticker.elapsedMS));
    };

    //VOICEVOXサーバーにリクエストしてAudioBufferをもらう関数
    playVoice = async (speaker: number, text: string, volumeScale?: number, speedScale?: number) => {
        if (this.voicevoxClient === null) return;
        const query: Query = await this.voicevoxClient.query.createQuery(speaker, text);
        query.speedScale = speedScale ?? 1.0;
        //query.prePhonemeLength = 0.1;
        query.postPhonemeLength = 0.3; //------最後に無音の時間を少し作る
        query.volumeScale = volumeScale ?? 1;
        const voiceArrayBuffer: ArrayBuffer = await this.voicevoxClient.voice.createVoice(speaker, query);
        // Web Audio APIで使える形式に変換
        const voiceAudioBufer: AudioBuffer = await this.audioContext.decodeAudioData(voiceArrayBuffer); //「ArrayBuffer」を「AudioBuffer」に変換
        this.hiyori.startVoice(this.pixiApp, voiceAudioBufer, 15);
    };

    //webspeechで話す
    playWebSpeech = (voice: SpeechSynthesisVoice, text: string, volume?: number) => {
        window.speechSynthesis.cancel(); //------------------これでwebspeechを止める

        const uttr = new SpeechSynthesisUtterance();
        uttr.text = text;
        uttr.volume = volume ?? 1.0;
        uttr.voice = voice;

        uttr.addEventListener("end", () => {
            window.speechSynthesis.cancel;
            this.hiyori.stopSpeak(); //最後まで話し終えたら口パク終了
        });

        window.speechSynthesis.speak(uttr);
        window.setTimeout(() => {
            this.hiyori.startSpeak(1);
        }, 100);
    };

    destoroy = (): void => {
        this.pixiApp.destroy();
    };
}

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
