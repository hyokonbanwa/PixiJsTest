import * as bootstrap from "bootstrap";
import { App } from "./App";

{
    //-- App初期化
    //let app: App | null = null;
    const app: App = new App();
    document.addEventListener("DOMContentLoaded", () => {
        app.mount();
    });

    //--ページ終了時の処理
    // window.addEventListener("beforeunload", () => {
    //     app.unmount();
    // });
    //-
}
