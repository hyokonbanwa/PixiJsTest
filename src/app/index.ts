import "../css/index.scss";
import * as bootstrap from "bootstrap";
import { App } from "./App";
import axios from "axios";

{
    // async function init() {
    //     const pixiOptions = {
    //         width: 1000,
    //         height: 1000,
    //         view: document.getElementById("myCanvas") as HTMLCanvasElement,
    //         transparent: true, //http://runstant.com/pentamania/projects/82dc0e31
    //     };
    //     const app = new PIXI.Application(pixiOptions);
    //     const food: PIXI.Sprite = PIXI.Sprite.from("/Resources/foodImgs/0002_カレー.jpg");
    //     app.stage.addChild(food);
    //     const modelOptions: Live2DFactoryOptions = {
    //         autoUpdate: false,
    //     };
    //     const model = (await Live2DModel.from("/Resources/Hiyori/Hiyori.model3.json", modelOptions)) as unknown as PIXI.DisplayObject & Live2DModel;
    //     model.x = 500;
    //     model.y = 500;
    //     app.stage.addChild(model);
    //     const ticker = new PIXI.Ticker();
    //     ticker.add(() => model.update(ticker.elapsedMS));
    // }
    // init();
    //-- App初期化
    // const testVOICEVOX = async () => {
    //     // axios.interceptors.response.use(function (response) {
    //     //     console.log(response);
    //     //     return response;
    //     // }, function (error) {
    //     //     console.log(error);
    //     // })
    //     const rpc = axios.create({ baseURL: "http://localhost:50021", proxy: false });
    //     //* まずtextを渡してsynthesis宛のパラメータを生成する、textはURLに付けるのでencodeURIで変換しておく。*/

    //     const audio_query = await rpc.post("audio_query?text=" + encodeURI("あいうろ") + "&speaker=1").catch(() => false);
    //     console.log(audio_query);
    //     // audio_query.data
    //     // const testClient = new Client("http://192.168.3.10:40080");
    //     // const query: Query = await testClient.query.createQuery(1, "あ");
    // };
    // testVOICEVOX().catch();

    window.addEventListener("load", async () => {
        //http://localhost:40080
        //http://60.130.130.16
        //http://192.168.3.10:40080
        const serverURL = "http://192.168.3.10:40080";

        //console.log(audio_query);
        const app: App = new App(serverURL); //
        app.mount();
    });
    //let app: App | null = null;
    // DOMContentLoadedだと発火されないときがある;
    // document.addEventListener("DOMContentLoaded", () => {
    //     app.mount();
    // });
    //--ページ終了時の処理
    // window.addEventListener("beforeunload", () => {
    //     app.unmount();
    // });
    //-
}
