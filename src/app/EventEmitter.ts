export class EventEmitter {
    private _listeners: Map<string, Set<Function>>;
    private _callBacks: Map<string, Set<Function | undefined>>;

    constructor() {
        // 登録する [イベント名, Set(リスナー関数)] を管理するMap
        this._listeners = new Map<string, Set<Function>>();
        this._callBacks = new Map<string, Set<Function | undefined>>();
    }

    /**
     * 指定したイベントが実行されたときに呼び出されるリスナー関数を登録する
     * @param {string} type イベント名
     * @param {Function} listener イベントリスナー
     * @param {Function} callback リスナー呼出し後に処理を呼び出せる、引数にはイベントリスナーの返り値を使う
     * 使い方は「listnerにモデルから情報を取得し描画する」関数をわたし、
     * 「listnerのreturn値を引数にとるコールバック関数」をセットすることができる
     * ※コールバックは描画処理の結果を使って何か処理をしたいときに指定する
     */
    addEventListener(type: string, listener: Function, callback?: Function): void {
        // 指定したイベントに対応するSetを作成しリスナー関数を登録する
        if (!this._listeners.has(type)) {
            this._listeners.set(type, new Set<Function>());
            this._callBacks.set(type, new Set<Function>());
        }
        const listenerSet: Set<Function> | undefined = this._listeners.get(type);
        listenerSet?.add(listener);
        const callbackSet: Set<Function | undefined> | undefined = this._callBacks.get(type);
        callbackSet?.add(callback);
    }

    /**
     * 指定したイベントをディスパッチする
     * @param {string} type イベント名
     */
    emit(type: string): any[] {
        // 指定したイベントに対応するSetを取り出し、すべてのリスナー関数を呼び出す
        const listenerSet: Set<Function> | undefined = this._listeners.get(type);
        const callBackSet: Set<Function | undefined> | undefined = this._callBacks.get(type);
        let lisnerResults: any[] = [];
        if (!listenerSet) {
            return [];
        }
        listenerSet.forEach((listener: Function): void => {
            const tmp: any = listener.call(this);
            lisnerResults.push(tmp); //リスナー関数の結果を受け取る
        });
        let index: number = 0;
        callBackSet?.forEach((callBack: Function | undefined): void => {
            callBack?.call(this, lisnerResults[index]); //thisをわたし関数の実行者がこのクラスの継承クラスであることを強制する、またリスナー関数の結果を渡す
            index += 1;
        });
        return lisnerResults; //処理単位の結果も受け取れる
    }

    /**
     * 指定したイベントのイベントリスナーを解除する
     * @param {string} type イベント名
     * @param {Function} listener イベントリスナー
     */
    removeEventListener(type: string, listener: Function) {
        // 指定したイベントに対応するSetを取り出し、該当するリスナー関数を削除する
        const listenerSet: Set<Function> | undefined = this._listeners.get(type);
        const callBackSet: Set<Function | undefined> | undefined = this._callBacks.get(type);
        if (!listenerSet) {
            return;
        }
        listenerSet.forEach((ownListener: Function): void => {
            if (ownListener === listener) {
                listenerSet.delete(listener);
            }
        });
        callBackSet?.forEach((ownCallBack: Function | undefined): void => {
            if (ownCallBack === listener) {
                callBackSet?.delete(listener);
            }
        });
    }
}
