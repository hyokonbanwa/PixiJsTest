{
    let indexLibrary = null;
    //VOICEVOXのサーバーアドレス 　サーバーはngrok等でhttps化しないとだめ
    const serverURL = "https://a48e-2400-2651-41c2-1500-4405-5e59-5c98-3b57.jp.ngrok.io";
    const debug = false;
    const modelPath = "https://cdn.jsdelivr.net/gh/GifuTaro/AgentInteractionResources@bbefa1fcbe1df13228b719d5a4e447d554199f38/Resources/Hiyori_2/hiyori.model3.json";

    //モデルの大きさと①
    //900, 900, 0.235, 0, -20 モデル全身/
    //550, 700, 0.45, 0, 500 モデル顔中心
    //225, 350, 0.25, 0, 250
    const position = {
        boxWidth: 500,
        boxHeight: 700,
        modelScale: 0.45,
        modelX: 0,
        modelY: 500,
    };

    Qualtrics.SurveyEngine.addOnload(function () {
        // const cssLink = document.createElement("link");
        // const cssPlace = document.getElementById("cssPlace");
        // // <link id="PageStyleSheet" rel="stylesheet" href="Style1.css" />
        // cssLink.href = "https://cdn.jsdelivr.net/gh/hyokonbanwa/InteractiveValueResources@809b43115db7ba562ae76cf2d3fffe9cff2d3bba/" + "css/SectionOmote.css";
        // cssLink.rel = "stylesheet";
        // cssPlace.appendChild(cssLink);

        //画面の縦横100%にする
        const skinInner = document.querySelector(".SkinInner");
        skinInner.classList.add("expand-section1");
        //画面の背景色変更
        if (debug === true) {
            skinInner.classList.add("bg-success");
            const body = document.getElementById("SurveyEngineBody");
            body.classList.add("bg-success");
        }

        //背景色
        //const jfe = document.querySelector(".JFE");
        //jfe.classList.add("bg-danger");
        //次ボタンを隠す
        this.hideNextButton();
        const requiredResources = [
            "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js",
            "https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js",
            "https://cdn.jsdelivr.net/gh/GifuTaro/AgentInteractionResources@bbefa1fcbe1df13228b719d5a4e447d554199f38/js/IndexLibrary.js",
        ];

        const loadScript = (idx) => {
            console.log("Loading ", requiredResources[idx]);
            jQuery.getScript(requiredResources[idx], function () {
                if (idx + 1 < requiredResources.length) {
                    loadScript(idx + 1);
                } else {
                    initExp();
                }
            });
        };

        const initExp = () => {
            //インスタンス作成＆DOMLoad操作
            console.log("ロード");
            indexLibrary = new IndexLibrary(debug, serverURL, modelPath, position);
            indexLibrary.onload();
        };

        console.log("スクリプト読み込み");
        loadScript(0);

        /*ページが読み込まれたときに実行するJavaScriptをここに配置してください*/
    });

    Qualtrics.SurveyEngine.addOnReady(function () {
        //windowLoad時の操作
        console.log("window");

        // if (myLibrary != null) {
        //     myLibrary.onReady();
        // }
        /*ページが完全に表示されたときに実行するJavaScriptをここに配置してください*/
    });

    Qualtrics.SurveyEngine.addOnUnload(function () {
        //windowUnLoad時の操作
        if (indexLibrary != null) {
            indexLibrary.onUnload();
        }
        /*ページの読み込みが解除されたときに実行するJavaScriptをここに配置してください*/
    });
}
