import * as PIXI from "pixi.js";
import * as PIXILive2D from "pixi-live2d-display";
//import * as PIXILive2D from "pixi-live2d-display";
import { CustomModel } from "./CustomModel";
import { Client, Query } from "voicevox-api-client";
//import { threadId } from "worker_threads";
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
    public hiyori: CustomModel;
    private audioContext: AudioContext;
    private voicevoxClient: Client;
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
            backgroundColor: 0x000099,
            resolution: window.devicePixelRatio || 1,
            //autoDensity: true,
            //transparent: true, //http://runstant.com/pentamania/projects/82dc0e31
        };
        this.app = new PIXI.Application(pixiOptions);
        this.audioContext = new AudioContext();
        //http://localhost:40080
        //http://60.130.130.16
        this.voicevoxClient = new Client("http://192.168.3.10:40080");

        //550, 900, 0.235, 0, -20 モデル全身/
        //550, 700, 0.45, 0, 500 モデル顔中心
        this.hiyori = new CustomModel("/Resources/Hiyori_2/Hiyori.model3.json", "normal1", 225, 350, 0.225, 0, 250);
        this.hiyori.audioContext = this.audioContext;
    }
    //ロード処理と初期配置を書く
    initialize = async () => {
        await this.hiyori.makeModel();
        const hiyoriModel = this.hiyori.getContainer();
        hiyoriModel.pivot.set(this.hiyori.getWidth() / 2, this.hiyori.getHeight() / 2);
        hiyoriModel.x = 500;
        hiyoriModel.y = 500;
        //hiyoriModel.scale.set(1.25, 1.25);
        const stage = this.app.stage;
        stage.addChild(hiyoriModel);
        this.hiyori.displayBox();
        this.hiyori.hitAreaOn();
        //this.hiyori.hitAreaOff();

        this.hiyori.idleGroup = "Idle"; //ひよりの通常時のモーショングループ
        //モデルをタップした時の動作を追加
        this.hiyori.onModelHit((hitArea: string) => {
            //体に当たったときのみ反応
            if (hitArea === "Body") {
                //話している最中はタッチに反応しない
                if (this.hiyori.isSpeaking === false && this.hiyori.isVoicing === false) {
                    this.hiyori.forceMotion(hitArea, undefined);
                    console.log("モデルヒット：" + hitArea);
                }
            }
        });

        //モデルが話始めたときの処理
        this.hiyori.onStartSpeak(() => {
            this.hiyori.forceMotion("StartSpeak", undefined);
            this.hiyori.idleGroup = "StartSpeak";
            console.log("口パク、または発話始め。");
        });

        //モデルの口パクボイスを中断したときの処理
        this.hiyori.onStopSpeak(() => {
            this.hiyori.idleGroup = "Idle";
            console.log("口パク、または発話中断");
        });

        this.hiyori.onModelUpdate(() => {
            //console.log(this.hiyori.isBoxOn);
            //マウスを見るかの調整
            if (this.hiyori.isBoxOn === false) {
                this.hiyori.mouseLooking = false;
            } else {
                this.hiyori.mouseLooking = true;
            }
            //console.log(this.hiyori.isSpeaking, this.hiyori.isVoicing);
            //console.log(this.hiyori.motionState);
        });

        this.hiyori.onFinishSpeak(() => {
            this.hiyori.idleGroup = "Idle";
            console.log("発話最後まで終了");
        });
        this.hiyori.onMotionFinished((currentGroup: string, currentIndex: number) => {
            console.log(`「${currentGroup}」グループの、「${currentIndex}」番目のモーションが終了`);
        });
        this.hiyori.onMotionStarted((currentGroup: string, currentIndex: number) => {
            console.log(`「${currentGroup}」グループの、「${currentIndex}」番目のモーションが開始`);
        });

        this.addUpdate();

        //const widget = new PIXI.
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

    //VOICEVOXサーバーにリクエストしてAudioBufferをもらう関数
    playVoice = async (speaker: number, text: string, volumeScale?: number) => {
        const query: Query = await this.voicevoxClient.query.createQuery(speaker, text);
        query.speedScale = 1.5;
        //query.prePhonemeLength = 0.1;
        query.postPhonemeLength = 0.3; //------最後に無音の時間を少し作る
        query.volumeScale = volumeScale ?? 1;
        const voiceArrayBuffer: ArrayBuffer = await this.voicevoxClient.voice.createVoice(speaker, query);
        // Web Audio APIで使える形式に変換
        const voiceAudioBufer: AudioBuffer = await this.audioContext.decodeAudioData(voiceArrayBuffer); //「ArrayBuffer」を「AudioBuffer」に変換
        this.hiyori.startVoice(voiceAudioBufer, 15);
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
