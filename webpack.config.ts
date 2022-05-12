/**
 * 0.webpackがexportsオブジェクトを読み込みnode環境でバンドルを実行する
 *
 * 1.webpack-dev-serverの特徴
 * ・distがルートフォルダになる
 * 　＝絶対パスでサーバーリソースにアクセスできる、distと同じかより上の階層のフォルダにはアクセスできない
 * ・dist以下のファイルはコードの確認をプログラマーができるように生成される
 * 　＝実際にはすべてのデータはコンピューターのメモリに保持される。そのためdistフォルダをいじっても何も起きない
 * 　＝クライアントサイドでのhttpリクエストを再現できる
 *
 * 2.webpack-dev-serverを使う場合のsrc内での相対パスと絶対パスの使い分け
 * ・インポート文など（ファイル同士の依存関係） webpackによるコンパイル時に解決されるものは、
 * 　自ファイルの位置から読み込みファイルの位置への相対パスで記述する。
 *
 * ・サーバー内での実行時に解決される物(「<a href = test.html>」などでサーバー内にあるリソースを使うことを想定するとき)
 * 　はdist以下をルートとする絶対パスで記述する。
 * 　例：ブラウザ実行時の処理で「dist/img/hoge.png」にアクセスしたいときは、
 * 　「/img/hoge.png」と記述する。
 * ※単にindex.htmlをファイルとして開く場合はエラーになる。これはルートがコンピュータルートフォルダーになってしまうため
 *
 *
 * 3.モジュール解決全体の流れ
 * src以下  {(src_css → src_ts)         & (src_html)             & (src_Resources)}
 *
 *              ↓ts-loader                ↓HtmlWebpackPlugin       ↓CopyPlugin
 *                & css-loader
 *                & MIniCssExtractPlugin
 *
 * dist以下 {（dist_js & dist_css）      & (dist_html)            & (dist_Resources)}
 *
 */
//  const path = require("path");
//  const HtmlWebpackPlugin = require("html-webpack-plugin");
//  const HtmlWebpackHarddiskPlugin = require("html-webpack-harddisk-plugin");
//  const MiniCssExtractPlugin = require("mini-css-extract-plugin");
//  const CopyPlugin = require("copy-webpack-plugin");
//const webpack = require("webpack");
//const { CleanWebpackPlugin } = require("clean-webpack-plugin");//Webpack5では要らない代わりにoutput.clean = true を使う

/** 以下 2 行は補完を効かせるためのインポート https://zenn.dev/sprout2000/articles/9d026d3d9e0e8f#webpack.config-%E3%82%92-typescript-%E3%81%A7%E8%A8%98%E8%BF%B0%E3%81%99%E3%82%8B */
import "webpack-dev-server";
import { Configuration } from "webpack";

//webpackのプラグイン
import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import HtmlWebpackHarddiskPlugin from "html-webpack-harddisk-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CopyPlugin from "copy-webpack-plugin";

// [定数] webpack の出力オプションを指定します
// 'production' か 'development' を指定
//https://zenn.dev/sprout2000/articles/9d026d3d9e0e8f#node_env-%E3%81%A7%E5%87%A6%E7%90%86%E3%82%92%E5%88%86%E5%B2%90%E3%81%99%E3%82%8B
if (process.env.NODE_ENV === void 0) {
    throw new Error("NODE_ENVが設定されていない");
}

const isDev = process.env.NODE_ENV === "development" ? true : false;
const MODE = isDev === true ? "development" : "production";

console.log(`モードは「${MODE}」`);
// CSSソースマップの利用有無(productionのときはソースマップを利用しない)
const enabledSourceMap = isDev === true ? true : false;
//jsのソースマップを有効にするかどうか
const enableDevTool = isDev === true ? "inline-source-map" : false;
const publicPath = isDev === true ? "/" : void 0;

const config: Configuration = {
    // モード値を production に設定すると最適化された状態で、
    // development に設定するとソースマップ有効でJSファイルが出力される
    mode: MODE,

    //ソースマップ生成設定https://webpack.js.org/configuration/devtool/
    devtool: enableDevTool, //"eval-cheap-module-source-map", //"eval-source-map", //"inline-source-map", //

    //バンドルターゲット
    target: ["web", "es2020"],

    // メインとなるJavaScriptファイル（エントリーポイント）
    entry: {
        IndexLibrary: {
            import: path.resolve(__dirname, "src/app/IndexLibrary.ts"),
            library: {
                // all options under `output.library` can be used here
                name: "IndexLibrary",
                type: "umd",
                umdNamedDefine: true,
                export: "default",
            },
        },
        //index: path.resolve(__dirname, "src/app/index.ts"),
    },

    /*
    entry:{
        index: path.resolve(__dirname, "src/indexApp/index.ts"),
        test: path.resolve(__dirname, "src/testApp/test.ts"),
    },
    */

    // ファイルの出力設定
    output: {
        // 出力ファイル名
        filename: "js/[name].js",
        path: path.resolve(__dirname, "dist"), //出力先　__dirnameはルートディレクトリ
        clean: true, //https://qiita.com/kenji123/items/9d5b7315851ab678e72a#%E5%87%BA%E5%8A%9B%E5%85%88%E3%82%92%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%81%AB%E3%81%97%E3%81%A6%E3%81%8B%E3%82%89%E3%82%A2%E3%83%83%E3%83%97
        publicPath: publicPath, //webpack-dev-serverを使うときに必要、webpackの出力先をサーバーのルート=プロジェクトルートからの相対パスを指定
        //静的ファイルの出力先
        //assetModuleFilename: "[name][ext][query]",
    },

    module: {
        rules: [
            /*https://jun-app.com/series/well-study-webpack/2#webpack5%E3%81%A7%E3%81%AE%E3%82%84%E3%82%8A%E6%96%B9
             {
             test: /\.(png|jpg|gif)$/i,
             // ここから変更。useがなくなり。typeが変更されている。
             generator: {
                 filename: 'imgs/[name][ext][query]'
             },
             type: 'asset/resource'
             },
             */

            /*
             //アセットモジュールを使う
             //https://marsquai.com/745ca65e-e38b-4a8e-8d59-55421be50f7e/99181429-1958-4966-90c1-2e9357ecf450/9c23df88-0922-49c6-b4c1-20050cc1e91e/
             {
                 test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif|csv|json)$/i,
                 type: "asset/resource",
                 generator: {
                     filename: "[name][ext][query]",
                 },
             },
             */

            /*
             {
                 test: /\.(json)$/i,
                 type: "asset/resource",
                 generator: {
                     filename: "[name][ext][query]",
                 },
             },
             */

            {
                //https://ics.media/entry/190325/
                // 拡張子 .ts の場合
                test: /\.ts$/,
                exclude: /node_modules/,
                // TypeScript をコンパイルする
                use: "ts-loader",
            },

            // CSSファイルの読み込みhttps://ics.media/entry/17376/
            {
                // 対象となるファイルの拡張子
                test: /\.css/,
                // ローダー名
                use: [
                    // linkタグに出力する機能
                    {
                        loader: MiniCssExtractPlugin.loader, //ローダー変更　//"style-loader",
                    },

                    // CSSをバンドルするための機能
                    {
                        loader: "css-loader",
                        options: {
                            // オプションでCSS内のurl()メソッドの取り込みを禁止する
                            url: false,
                            // ソースマップを有効にする
                            sourceMap: enabledSourceMap,
                        },
                    },
                ],
            },

            // SCSSファイルの読み込みhttps://github.com/ics-creative/170330_webpack/blob/master/tutorial-bootstrap-style-js/webpack.config.js
            {
                // 対象となるファイルの拡張子(scss)
                test: /\.scss$/,
                // Sassファイルの読み込みとコンパイル
                use: [
                    // CSSファイルを書き出すオプションを有効にする
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    // CSSをバンドルするための機能
                    {
                        loader: "css-loader",
                        options: {
                            // オプションでCSS内のurl()メソッドの取り込まない
                            url: false,
                            // ソースマップの利用有無
                            sourceMap: true,
                            // Sass+PostCSSの場合は2を指定
                            importLoaders: 2,
                        },
                    },
                    // PostCSSのための設定
                    {
                        loader: "postcss-loader",
                        options: {
                            // PostCSS側でもソースマップを有効にする
                            sourceMap: true,
                            postcssOptions: {
                                // ベンダープレフィックスを自動付与する
                                plugins: ["autoprefixer"],
                            },
                        },
                    },
                    // Sassをバンドルするための機能
                    {
                        loader: "sass-loader",
                        options: {
                            // ソースマップの利用有無
                            sourceMap: true,
                        },
                    },
                ],
            },

            /*
            // You need this, if you are using `import file from "file.ext"`, for `new URL(...)` syntax you don't need it
            {
                test: /\.(jpe?g|png)$/i,
                exclude: /src/,
                type: "asset",
            },
            */
        ],
    },

    plugins: [
        //html生成
        //https://teratail.com/questions/238214
        //https://gist.github.com/giisyu/12dfe2a4bde329b8ea99747fe87f63a9

        new HtmlWebpackPlugin({
            filename: "index.html", //どんな名前のファイルを生成するか
            //publicPath: "dist/",
            template: path.resolve(__dirname, "src/templates/index.html"), //どのhtmlを使うか
            inject: "head", //どこにスクリプト配置するか
            scriptLoading: "defer", //スクリプトの読み込み属性
            chunks: ["IndexLibrary"], //どのエントリーキー=生成されるjsファイルを使うか
            alwaysWriteToDisk: true, //サーバー起動時htmlの変更でホットリロードする　https://qiita.com/kesoji/items/17be4578727aa5023fe8
            //publicPath:
        }),
        // new HtmlWebpackPlugin({
        //     filename: "test.html",
        //     //publicPath: "dist/",
        //     template: path.resolve(__dirname, "src/templates/test.html"),
        //     inject: "head",
        //     scriptLoading: "defer",
        //     chunks: ["test"],
        //     alwaysWriteToDisk: true,
        //     //publicPath:
        // }),

        new HtmlWebpackHarddiskPlugin(), //ホットリロード用プラグイン

        //スタイルシートを分離する
        //https://webpack.js.org/plugins/mini-css-extract-plugin/#extracting-css-based-on-entry
        new MiniCssExtractPlugin({ filename: "css/[name].css" }),

        //個々のファイルまたは既に存在するディレクトリ全体をビルドディレクトリにコピーします。
        //https://runebook.dev/ja/docs/webpack/plugins/copy-webpack-plugin
        new CopyPlugin({
            patterns: [{ from: path.resolve(__dirname, "src/Resources"), to: "Resources" }],
        }),

        //dist内の余計なファイルを除去する
        //new CleanWebpackPlugin(),
        //new webpack.HotModuleReplacementPlugin(),
    ],

    resolve: {
        // 拡張子を配列で指定
        // import 文で .ts ファイルを解決するため
        // これを定義しないと import 文で拡張子を書く必要が生まれる。
        // フロントエンドの開発では拡張子を省略することが多いので、
        // 記載したほうがトラブルに巻き込まれにくい。
        extensions: [".ts", ".js"],

        //: import時のaliasを設定するときはWebpack、TypeScript、ESLintの3つを対応しなければならない件
        //https://qiita.com/Statham/items/8a1161c7816e360590f3
        //https://na-ginnan.com/react-webpack-path-config/
        // alias: {
        //     "@/Live2DModel": path.resolve(__dirname, "/node_modules/pixi-live2d-display/src/Live2DModel.ts"), //import文で指定できる
        //     //     //Mymodule: path.resolve(__dirname, "./src/indexApp/myTypes.ts"),
        // },
    },

    // ローカル開発用環境を立ち上げる
    // 実行時にブラウザが自動的に localhost を開く
    devServer: {
        //static: "dist",
        open: "/", //"/index.html", //true,
        static: {
            directory: path.join(__dirname, "dist"), //サーバーのルートディレクトリ「ルート/dist/」となる

            //ホットリロード有効化
            //outputのpathとdevServerのcontentBaseを同じにする
            //outputのpublicPathとdevServerのpublicPathを同じにする
            //https://zukucode.com/2017/04/vue-webpack-hmr.html#:~:text=output%E3%81%AEpath%E3%81%A8devServer,publicPath%E3%82%92%E5%90%8C%E3%81%98%E3%81%AB%E3%81%99%E3%82%8B
            publicPath: publicPath,
        },
        hot: true,

        //host: "0.0.0.0",

        /*         static: [
             {
                 directory: path.resolve(__dirname, "dist"),
                 publicPath: "/dist",
             },
             {
                 directory: __dirname,
                 publicPath: "/",
             },
         ], */

        //https://webpack.js.org/configuration/dev-server/#websocketurl
        // client: {
        //     webSocketURL: {
        //         hostname: "0.0.0.0",
        //         pathname: "/ws",
        //         password: "dev-server",
        //         port: 8080,
        //         protocol: "ws",
        //         username: "webpack",
        //     },
        // },
    },

    // //https://webpack.js.org/configuration/dev-server/#websocketurl
    // externals: {
    //     fs: "commonjs fs",
    //     path: "commonjs path",
    // },

    //webpackの中に画像の圧縮処理など、重い処理を含めるとwarningが表示されます。それを回避する設定
    performance: {
        hints: false,
        maxEntrypointSize: 512000,
        maxAssetSize: 512000,
    },
};

// const entries = {
//     index: path.resolve(__dirname, "src/indexApp/Mylibrary.ts"),
//     test: path.resolve(__dirname, "src/testApp/test.ts"),
// };

// const htmlSrc = {
//     index: ["index"],
//     test: ["test"],
// };

// config.entry = entries;

// Object.keys(htmlSrc).forEach((currentValue) => {
//     config.plugins.push(
//         new HtmlWebpackPlugin({
//             filename: `${currentValue}.html`,
//             //publicPath: "dist/",
//             template: path.resolve(__dirname, `src/templates/${currentValue}.html`),
//             inject: "head",
//             scriptLoading: "defer",
//             chunks: htmlSrc[currentValue],
//             alwaysWriteToDisk: true,
//             //publicPath:
//         })
//     );
// });

// 設定をデフォルトエクスポート
export default config;
