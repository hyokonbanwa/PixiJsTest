//20220503 使用するのをやめた。
//VOICEVOXのクラス。

import { Client, Query } from "voicevox-api-client";
export class VOICEVOXAudio {
    private audioSource: AudioBufferSourceNode | null;
    public isPlaying: boolean;
    private intervalID: number | null;
    private client: Client;
    private ctx: AudioContext;
    private startVoiceTime: number;
    constructor(client: Client, ctx: AudioContext) {
        this.audioSource = null;
        this.isPlaying = false;
        this.intervalID = null;
        this.ctx = ctx;
        this.client = client;
        this.startVoiceTime = 0;
    }
    //VOICEVOXサーバーにリクエストしてAudioBufferをもらう関数
    createVoice = async (speaker: number, text: string, volumeScale?: number): Promise<AudioBuffer> => {
        const query: Query = await this.client.query.createQuery(speaker, text);
        //query.speedScale = 1.5;
        //query.prePhonemeLength = 0.1;
        query.postPhonemeLength = 0.3;
        query.volumeScale = volumeScale ?? 1;
        const voiceArrayBuffer: ArrayBuffer = await this.client.voice.createVoice(speaker, query);
        // Web Audio APIで使える形式に変換
        const voiceAudioBufer: AudioBuffer = await this.ctx.decodeAudioData(voiceArrayBuffer); //「ArrayBuffer」を「AudioBuffer」に変換
        return voiceAudioBufer;
    };
    // AudioBufferをctxに接続し再生する関数
    playVoice = (audioBuffer: AudioBuffer, isAnalyzing: boolean, playingCallback?: (currentVolume: number) => void, callTimes?: number, finishCallback?: () => void) => {
        //再生中なら停止
        if (this.isPlaying === true && this.intervalID !== null) {
            this.stopVoice();
            window.clearInterval(this.intervalID);
        }
        //ステータスを再生にする
        this.isPlaying = true;

        callTimes = callTimes ?? 15;

        //AudioCOntextで扱うプレイヤー作成
        this.audioSource = this.ctx.createBufferSource();
        // 変換されたバッファーを音源として設定
        this.audioSource.buffer = audioBuffer; //音源をプレイヤーに設定

        //再生終了時にstop()するリスナー登録
        this.audioSource.addEventListener("ended", (e: Event) => {
            if (this.intervalID !== null) {
                //const target: AudioBufferSourceNode = e.target as AudioBufferSourceNode;
                //console.log(e.target);

                this.isPlaying = false;

                if (this.audioSource?.buffer) {
                    if (finishCallback !== void 0 && this.audioSource?.buffer?.duration <= this.ctx.currentTime - this.startVoiceTime) {
                        finishCallback();
                    }
                }
                console.log("AudioNodeストップ");
                this.stopVoice();
                window.clearInterval(this.intervalID);
            }
        });

        this.startVoiceTime = this.ctx.currentTime;
        //解析するなら
        if (isAnalyzing === false) {
            this.audioSource.connect(this.ctx.destination);
            this.audioSource.start();
        }
        //解析しないなら
        else {
            //アナライザー作成
            const analyser: AnalyserNode = this.ctx.createAnalyser();
            analyser.fftSize = 512; //サンプリングレート

            //プレイヤー→アナライザー→出力
            //プレイヤーをアナライザーにつなげる。
            this.audioSource.connect(analyser);
            //アナライザーを出力につなげる。
            analyser.connect(this.ctx.destination);

            //再生開始
            this.audioSource.start();
            //ループするリスナー登録
            this.intervalID = window.setInterval(() => {
                // 一秒あたりfftSize個に分割した音量を取得する
                const timeVolumes = new Uint8Array(analyser.fftSize);
                analyser.getByteTimeDomainData(timeVolumes);
                const currentVolume = normalizeLastVolume(timeVolumes); //音量を0～1に正規化

                //コールバックないならログ出す
                if (playingCallback === void 0) {
                    console.log(currentVolume);
                } else {
                    //コールバックあるなら実行する
                    playingCallback(currentVolume);
                }
            }, 1000 / callTimes);

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

    stopVoice = (): void => {
        if (this.intervalID === null) return console.log("VOICEVOXは何も再生していません");
        this.isPlaying = false;
        this.audioSource?.stop();
        window.clearInterval(this.intervalID);
    };
}

// [
//     {
//         name: "四国めたん",
//         speaker_uuid: "7ffcb7ce-00ec-4bdc-82cd-45a8889e43ff",
//         styles: [
//             { id: 2, name: "ノーマル" },
//             { id: 0, name: "あまあま" },
//             { id: 6, name: "ツンツン" },
//             { id: 4, name: "セクシー" },
//         ],
//         version: "0.11.4",
//     },
//     {
//         name: "ずんだもん",
//         speaker_uuid: "388f246b-8c41-4ac1-8e2d-5d79f3ff56d9",
//         styles: [
//             { id: 3, name: "ノーマル" },
//             { id: 1, name: "あまあま" },
//             { id: 7, name: "ツンツン" },
//             { id: 5, name: "セクシー" },
//         ],
//         version: "0.11.4",
//     },
//     { name: "春日部つむぎ", speaker_uuid: "35b2c544-660e-401e-b503-0e14c635303a", styles: [{ id: 8, name: "ノーマル" }], version: "0.11.4" },
//     { name: "雨晴はう", speaker_uuid: "3474ee95-c274-47f9-aa1a-8322163d96f1", styles: [{ id: 10, name: "ノーマル" }], version: "0.11.4" },
//     { name: "波音リツ", speaker_uuid: "b1a81618-b27b-40d2-b0ea-27a9ad408c4b", styles: [{ id: 9, name: "ノーマル" }], version: "0.11.4" },
//     { name: "玄野武宏", speaker_uuid: "c30dc15a-0992-4f8d-8bb8-ad3b314e6a6f", styles: [{ id: 11, name: "ノーマル" }], version: "0.11.4" },
//     { name: "白上虎太郎", speaker_uuid: "e5020595-5c5d-4e87-b849-270a518d0dcf", styles: [{ id: 12, name: "ノーマル" }], version: "0.11.4" },
//     { name: "青山龍星", speaker_uuid: "4f51116a-d9ee-4516-925d-21f183e2afad", styles: [{ id: 13, name: "ノーマル" }], version: "0.11.4" },
//     { name: "冥鳴ひまり", speaker_uuid: "8eaad775-3119-417e-8cf4-2a10bfd592c8", styles: [{ id: 14, name: "ノーマル" }], version: "0.11.4" },
//     {
//         name: "九州そら",
//         speaker_uuid: "481fb609-6446-4870-9f46-90c4dd623403",
//         styles: [
//             { id: 16, name: "ノーマル" },
//             { id: 15, name: "あまあま" },
//             { id: 18, name: "ツンツン" },
//             { id: 17, name: "セクシー" },
//             { id: 19, name: "ささやき" },
//         ],
//         version: "0.11.4",
//     },
// ];

// const voicevoxes = [
//     "四国めたん　あまあま",
//     "ずんだもん　あまあま",
//     "四国めたん　ノーマル",
//     "ずんだもん　ノーマル",
//     "四国めたん　セクシー",
//     "ずんだもん　セクシー",
//     "四国めたん　ツンツン",
//     "ずんだもん　ツンツン",
//     "春日部つむぎ　ノーマル",
//     "波音リツ　ノーマル",
//     "雨晴はう　ノーマル",
//     "玄野勇宏　ノーマル",
//     "百上虎太郎　ノーマル",
//     "青山龍星　ノーマル",
//     "冥鳴日ひまり　ノーマル",
//     "九州そら　あまあま",
//     "九州そら　ノーマル",
//     "九州そら　セクシー",
//     "九州そら　つんつん",
//     "九州そら　ささやき",
// ];
