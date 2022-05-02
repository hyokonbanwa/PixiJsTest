import { MyCanvas } from "./MyCanvas";
import * as PIXILive2D from "pixi-live2d-display";
import axios from "axios";
interface CustomModelSettings extends PIXILive2D.ModelSettings {
    expressions?: Object[];
    groups?: Object[];
    hitAreas?: Object[];
    layout?: any;
    motions?: Object[];
}
export class App {
    private pixiCanvas: MyCanvas | null;
    private serverURL: string;
    private serverConnect: boolean;
    constructor(serverURL: string) {
        this.pixiCanvas = null;
        this.serverConnect = false;
        this.serverURL = serverURL;
    }
    mount = async () => {
        console.log("Appマウント");

        const rpc = axios.create({ baseURL: this.serverURL, proxy: false });
        //* まずtextを渡してsynthesis宛のパラメータを生成する、textはURLに付けるのでencodeURIで変換しておく。*/
        this.serverConnect = await rpc
            .post("audio_query?text=" + encodeURI("あいうえお。") + "&speaker=1")
            .then(() => true)
            .catch(() => false);
        console.log("サーバーコネクト：" + this.serverConnect);

        this.pixiCanvas = new MyCanvas(this.serverConnect, this.serverURL);

        //windowAudioContext構成
        window.AudioContext = window.AudioContext ?? window.webkitAudioContext;

        //

        //音声のセレクトボックス作成
        const selectBoxVoice = document.getElementById("selectVoice") as HTMLSelectElement;
        const voicevoxes = [
            "四国めたん　あまあま",
            "ずんだもん　あまあま",
            "四国めたん　ノーマル",
            "ずんだもん　ノーマル",
            "四国めたん　セクシー",
            "ずんだもん　セクシー",
            "四国めたん　ツンツン",
            "ずんだもん　ツンツン",
            "春日部つむぎ　ノーマル",
            "波音リツ　ノーマル",
            "雨晴はう　ノーマル",
            "玄野勇宏　ノーマル",
            "百上虎太郎　ノーマル",
            "青山龍星　ノーマル",
            "冥鳴日ひまり　ノーマル",
            "九州そら　あまあま",
            "九州そら　ノーマル",
            "九州そら　セクシー",
            "九州そら　つんつん",
            "九州そら　ささやき",
        ];
        //VOICECOX
        if (this.serverConnect === true) {
            for (let i: number = 0; i < voicevoxes.length; i++) {
                let select = document.createElement("option");
                select.innerText = voicevoxes[i];
                if (i === 4) {
                    select.selected = true;
                }
                selectBoxVoice.appendChild(select);
            }
        }
        //WEB SPEECH API
        let voices: SpeechSynthesisVoice[];
        const intervalID = window.setInterval(() => {
            voices = window.speechSynthesis.getVoices();
            if (voices.length !== 0) {
                //console.log(voices);
                window.clearInterval(intervalID);
                for (let i: number = 0; i < voices.length; i++) {
                    let select = document.createElement("option");
                    select.innerText = voices[i].voiceURI;
                    selectBoxVoice.appendChild(select);
                }
            }
        }, 1);

        //ボタンリスナー登録
        const normalButton = document.getElementById("normalEx") as HTMLElement;
        normalButton.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            this.pixiCanvas?.hiyori.setExpression(1);
        });

        const negativeButton = document.getElementById("negativeEx") as HTMLElement;
        negativeButton.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            this.pixiCanvas?.hiyori.setExpression(0);
        });

        const expansionButton = document.getElementById("expansion") as HTMLElement;
        expansionButton.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            if (this.pixiCanvas === null) return;
            const box = this.pixiCanvas.hiyori.getContainer();
            box.scale.set(box.scale.x * 1.1, box.scale.y * 1.1);
        });

        const shrinkButton = document.getElementById("shrink") as HTMLElement;
        shrinkButton.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            if (this.pixiCanvas === null) return;
            const box = this.pixiCanvas.hiyori.getContainer();
            box.scale.set(box.scale.x * 0.9, box.scale.y * 0.9);
        });

        const startButton = document.getElementById("speakStart") as HTMLElement;
        startButton.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            if (this.pixiCanvas === null) return;
            window.speechSynthesis.pause(); //------------------これでwebspeechを止める
            this.pixiCanvas.hiyori.startSpeak(1);
        });

        const stopButton = document.getElementById("speakStop") as HTMLElement;
        stopButton.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            if (this.pixiCanvas === null) return;
            this.pixiCanvas.hiyori.stopSpeak();
            window.speechSynthesis.cancel(); //------------------これでwebspeechを止める
        });

        const voiceStart = document.getElementById("voiceStart") as HTMLElement;
        voiceStart.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            if (this.pixiCanvas === null) return;
            const textBox = document.getElementById("textBox") as HTMLTextAreaElement;
            const index = selectBoxVoice.selectedIndex;

            //サーバーがつながっていて、VOICEVOXが選択されているなら実行
            if (this.serverConnect === true && index < voicevoxes.length) {
                const speaker = index; //speakerのidは0～19
                //文字が入力されているなら
                if (textBox.value === "") {
                    console.log("文字が入力されていない");
                    this.pixiCanvas.playVoice(speaker, "私に話させたい文字列を入力してください。");
                } else {
                    this.pixiCanvas.playVoice(speaker, textBox.value, 1.75);
                }
            }
            //SpeechAPIが選択されているかサーバーがつながっていないなら実行
            else if (index >= voicevoxes.length || this.serverConnect === false) {
                const voiceURI = selectBoxVoice.value;
                //VoiceURIが一致するvoiceを探す
                let voice;
                voices.some((currentValue: SpeechSynthesisVoice) => {
                    if (voiceURI === currentValue.voiceURI) {
                        voice = currentValue;
                        return true;
                    }
                });

                if (voice !== void 0) {
                    //文字が入力されているなら
                    if (textBox.value === "") {
                        console.log("文字が入力されていない");
                        this.pixiCanvas.playWebSpeech(voice, "私に話させたい文字列を入力してください。", 1.0);
                    } else {
                        this.pixiCanvas.playWebSpeech(voice, textBox.value, 1.0);
                    }
                }
            }
            //建設業大手の腹黒(はらぐろ)建設が埼玉県内の土地の売買などをめぐって法人税数千万円を脱税した疑いが強まり、東京地検 特捜部などはきょう、群馬県高崎市の本社などを一斉に家宅捜索しました。
            //早口言葉は、言いにくい言葉を通常より早く喋り、うまく言うことができるかを競う言葉遊び。また、それに用いる語句や文章。その多くは音節が舌を動かしづらい順序に並んでいて、文章の意味が脳で捉えにくいものになっている。 アナウンサーや俳優など、人前で話す職業に従事する人が滑舌を鍛える発声トレーニングに用いることもある。
            //あいうえお。かきくけこ。
        });

        //pixiアプリ初期化
        await this.pixiCanvas.initialize();

        const modelSettings: CustomModelSettings = this.pixiCanvas.hiyori.settings as CustomModelSettings;

        console.log(modelSettings);

        //const voiceStop = document.getElementById("voiceStop") as HTMLElement;
        // voiceStop.addEventListener("click", (e: MouseEvent) => {
        //     this.pixiCanvas.hiyori.stopSpeak();
        //     // this.pixiCanvas.hiyori.container.width = 500;
        //     // this.pixiCanvas.hiyori.container.height = 1000;
        // });
    };
}
