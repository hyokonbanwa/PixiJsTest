/*

1.結果の手に入れ方

結果を受け取るには
Qualtrics.SurveyEngine.addOnload(function()	{});の{}内で
「JSON.parse('${e://Field/sectionOneResult}');」を使う
シングルクオーテーション　SON.parse(' ')じゃないとエラーになる。

2.結果の内容
渡されるものは下記の例のようなオブジェクトの配列  [object,object...]
オブジェクトの数は4つ

例：
	{
		foodName: "ナポリタン", // 食べ物の名前
		id: 9, // id 一意の値
		//食べ物の画像のpath
		path: "https://cdn.jsdelivr.net/gh/hyokonbanwa/InteractiveValueResources@bba47ac9bf7712262230846f0f204efa82302a95/Resources/foodImgs/0013_ナポリタン.jpg",
		score: 97, //1～100の得点
		use: 1, //得点　0～10なら-1、90～100なら1
	}

3.具体的な使い方は次のブロックにあるので参考にしてください
*/
{
    let indexLibrary = null;
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

        //背景色
        //const jfe = document.querySelector(".JFE");
        //jfe.classList.add("bg-danger");
        //次ボタンを隠す
        this.hideNextButton();
        //https://cdn.jsdelivr.net/gh/GifuTaro/InteractiveValueResources@main/css/SectionOmote.css
        //https://cdn.jsdelivr.net/gh/hyokonbanwa/InteractiveValueResources@314b41d7013a67b7460c1aba0509061ce9d85607/
        const requiredResources = [
            "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js",
            "https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js",
            "https://cdn.jsdelivr.net/gh/hyokonbanwa/QualtricsAppResources2@main/js/IndexLibrary.js",
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
            //http://localhost:40080
            //http://60.130.130.16
            //http://192.168.3.10:40080
            const serverURL = "https://192.168.3.10:40080";
            const debug = false;
            const modelPath = "https://cdn.jsdelivr.net/gh/hyokonbanwa/QualtricsAppResources2@main/Resources/Hiyori_2/Hiyori.model3.json";

            //550, 900, 0.235, 0, -20 モデル全身/
            //550, 700, 0.45, 0, 500 モデル顔中心
            //225, 350, 0.25, 0, 250
            const position = {
                boxWidth: 550,
                boxHeight: 700,
                modelScale: 0.45,
                modelX: 0,
                modelY: 500,
            };
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
