import { MyCanvas } from "./MyCanvas";
export class App {
    private pixiCanvas: MyCanvas;
    constructor() {
        this.pixiCanvas = new MyCanvas();
    }
    mount = () => {
        //windowAudioContext構成
        window.AudioContext = window.AudioContext ?? window.webkitAudioContext;

        console.log("Appマウント");
        //pixiアプリ初期化
        this.pixiCanvas.initialize();

        const selectBox = document.getElementById("select") as HTMLSelectElement;
        for (let i: number = 0; i < 19; i++) {
            let select = document.createElement("option");
            select.innerText = String(i + 1);
            if (i === 4 - 1) {
                select.selected = true;
            }
            selectBox.appendChild(select);
        }

        //ボタンリスナー登録
        const normalButton = document.getElementById("normalEx") as HTMLElement;
        normalButton.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            this.pixiCanvas.hiyori.setExpression(1);
        });

        const negativeButton = document.getElementById("negativeEx") as HTMLElement;
        negativeButton.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            this.pixiCanvas.hiyori.setExpression(0);
        });

        const expansionButton = document.getElementById("expansion") as HTMLElement;
        expansionButton.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            const box = this.pixiCanvas.hiyori.getContainer();
            box.scale.set(box.scale.x * 1.1, box.scale.y * 1.1);
        });

        const shrinkButton = document.getElementById("shrink") as HTMLElement;
        shrinkButton.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            const box = this.pixiCanvas.hiyori.getContainer();
            box.scale.set(box.scale.x * 0.9, box.scale.y * 0.9);
        });

        const startButton = document.getElementById("speakStart") as HTMLElement;
        startButton.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            this.pixiCanvas.hiyori.startSpeak(1);
        });

        const stopButton = document.getElementById("speakStop") as HTMLElement;
        stopButton.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            this.pixiCanvas.hiyori.stopSpeak();
        });

        const voiceStart = document.getElementById("voiceStart") as HTMLElement;
        voiceStart.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            const textBox = document.getElementById("textBox") as HTMLTextAreaElement;
            const speaker = parseInt(selectBox.value);
            //console.log(speaker);
            if (textBox.value === "") {
                console.log("文字がない");
                this.pixiCanvas.playVoice(speaker, "私に話させたい文字列を入力してください。");
            } else {
                this.pixiCanvas.playVoice(speaker, textBox.value, 1.75);
            }
            //建設業大手の腹黒(はらぐろ)建設が埼玉県内の土地の売買などをめぐって法人税数千万円を脱税した疑いが強まり、東京地検 特捜部などはきょう、群馬県高崎市の本社などを一斉に家宅捜索しました。
            //早口言葉は、言いにくい言葉を通常より早く喋り、うまく言うことができるかを競う言葉遊び。また、それに用いる語句や文章。その多くは音節が舌を動かしづらい順序に並んでいて、文章の意味が脳で捉えにくいものになっている。 アナウンサーや俳優など、人前で話す職業に従事する人が滑舌を鍛える発声トレーニングに用いることもある。
            //あいうえお。かきくけこ。
        });
        //const voiceStop = document.getElementById("voiceStop") as HTMLElement;
        // voiceStop.addEventListener("click", (e: MouseEvent) => {
        //     this.pixiCanvas.hiyori.stopSpeak();
        //     // this.pixiCanvas.hiyori.container.width = 500;
        //     // this.pixiCanvas.hiyori.container.height = 1000;
        // });
    };
}
