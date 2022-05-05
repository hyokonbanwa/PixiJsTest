import * as PIXI from "pixi.js";
type RangeEvent = "move" | "pressup" | "change";
//import * as IndexDefine from "./indexDefine";
interface DragObject extends PIXI.Graphics {
    dragging: boolean;
}

export class Range {
    private dragPointX: number | null;
    private rangeLength: number;
    private rangeHeight: number;
    private handleSize: number;
    private handlePoint: number;
    public step: number;
    private beforeStep: number;
    private max: number;
    public readonly range: PIXI.Container;
    private underBar: PIXI.Graphics;
    private upBar: PIXI.Graphics;
    private handle: PIXI.Graphics;

    constructor(width: number, height: number, max: number, first?: number) {
        /*
        this.stage.addEventListener("click", () => {
            console.log(this.stage.mouseX, this.stage.mouseY);
        });
        */
        const radius: number = height / 2;
        this.dragPointX = null;
        this.rangeLength = width;
        this.rangeHeight = height;
        this.handleSize = this.rangeHeight;
        this.max = max;
        if (first != void 0) {
            if (first > max || max < 0) {
                throw new Error("初期値が無効");
            }
            this.handlePoint = (first / max) * 100;
            //console.log(this.handlePoint);
            this.step = first;
        } else {
            this.handlePoint = (Math.round(max / 2) / max) * 100;
            //console.log(this.handlePoint);
            this.step = Math.round(max * 0.5);
        }
        this.beforeStep = this.step;

        // コンテナー(容れ物)を作成
        this.range = new PIXI.Container();

        // バーを作成
        this.underBar = new PIXI.Graphics();
        this.underBar.beginFill(0x808080).drawRoundedRect(0, 0, this.rangeLength, this.rangeHeight, radius).lineStyle(3, 0x000000, 1).drawRoundedRect(0, 0, this.rangeLength, this.rangeHeight, radius);

        const underBarClick = (event: PIXI.InteractionEvent) => {
            const mousePoint = this.underBar.toLocal(event.data.global);
            const xPoint = mousePoint.x;
            if (xPoint >= 0 && xPoint <= this.rangeLength) {
                //this.handle.x = xPoint;
                this.handle.x = (Math.round((xPoint / this.rangeLength) * max) / max) * this.rangeLength;
            } else if (xPoint < 0) {
                this.handle.x = 0;
            } else if (xPoint > this.rangeLength) {
                this.handle.x = this.rangeLength;
            }
            this.handlePoint = (this.handle.x / this.rangeLength) * 100;
            //this.handlePoint = (this.handle.x / this.rangeLength) * 100;
            this.step = Math.round(this.max * (this.handlePoint / 100));
            this.upBar.clear();
            this.upBar
                .beginFill(0x00bfff)
                .drawRoundedRect(0, 0, (this.rangeLength * this.handlePoint) / 100, this.rangeHeight, radius)
                .lineStyle(3, 0x000000, 1)
                .drawRoundedRect(0, 0, (this.handlePoint / 100) * this.rangeLength, this.rangeHeight, radius);
            //this.stage.update();
        };
        this.underBar.on("click", underBarClick);
        this.underBar.interactive = true;
        this.range.addChild(this.underBar);

        //
        this.upBar = new PIXI.Graphics();
        this.upBar
            .beginFill(0x00bfff)
            .drawRoundedRect(0, 0, (this.handlePoint / 100) * this.rangeLength, this.rangeHeight, radius)
            .lineStyle(3, 0x000000, 1)
            .drawRoundedRect(0, 0, (this.handlePoint / 100) * this.rangeLength, this.rangeHeight, radius);

        const upBarClick = (event: PIXI.InteractionEvent) => {
            const mousePoint = this.upBar.toLocal(event.data.global);
            const xPoint = mousePoint.x;
            if (xPoint >= 0 && xPoint <= this.rangeLength) {
                //this.handle.x = xPoint;
                this.handle.x = (Math.round((xPoint / this.rangeLength) * max) / max) * this.rangeLength;
            } else if (xPoint < 0) {
                this.handle.x = 0;
            } else if (xPoint > this.rangeLength) {
                this.handle.x = this.rangeLength;
            }
            this.handlePoint = (this.handle.x / this.rangeLength) * 100;
            //this.handlePoint = (this.handle.x / this.rangeLength) * 100;
            this.step = Math.round(this.max * (this.handlePoint / 100));
            this.upBar.clear();
            this.upBar
                .beginFill(0x00bfff)
                .drawRoundedRect(0, 0, (this.rangeLength * this.handlePoint) / 100, this.rangeHeight, radius)
                .lineStyle(3, 0x000000, 1)
                .drawRoundedRect(0, 0, (this.handlePoint / 100) * this.rangeLength, this.rangeHeight, radius);
            //this.stage.update();
        };
        this.upBar.on("click", upBarClick);
        this.range.addChild(this.upBar);
        this.upBar.interactive = true;

        //　ハンドルを作成
        this.handle = new PIXI.Graphics();
        this.handle.beginFill(0x1e90ff).drawCircle(0, this.rangeHeight / 2, (this.handleSize * 3) / 4);
        this.handle.x = (this.rangeLength * this.handlePoint) / 100;
        const handleDown = (event: PIXI.InteractionEvent): void => {
            //console.log(this.handle.globalToLocal);
            // ドラッグを開始した座標を覚えておく
            const mousePoint = this.underBar.toLocal(event.data.global);
            this.dragPointX = mousePoint.x - this.handle.x;
            //dragPointY = mousePoint.y - handle.y;
            //stage.update();
            const target: DragObject = event.currentTarget as DragObject;
            target.dragging = true;
        };
        const handleMove = (event: PIXI.InteractionEvent): void => {
            const target: DragObject = event.currentTarget as DragObject;
            if (target.dragging === false || target.dragging === void 0) return;
            const mousePoint = this.underBar.toLocal(event.data.global); //ここでthis.handle.globalTolocalにするとあらぶるので起点をunderBarにする
            const xPoint = mousePoint.x - (this.dragPointX as number);
            if (xPoint >= 0 && xPoint <= this.rangeLength) {
                //this.handle.x = xPoint;
                this.handle.x = (Math.round((xPoint / this.rangeLength) * max) / max) * this.rangeLength;
            } else if (xPoint < 0) {
                this.handle.x = 0;
            } else if (xPoint > this.rangeLength) {
                this.handle.x = this.rangeLength;
            }
            this.handlePoint = (this.handle.x / this.rangeLength) * 100;
            //this.handlePoint = (this.handle.x / this.rangeLength) * 100;
            this.step = Math.round(this.max * (this.handlePoint / 100));
            this.upBar.clear();
            this.upBar
                .beginFill(0x00bfff)
                .drawRoundedRect(0, 0, (this.rangeLength * this.handlePoint) / 100, this.rangeHeight, radius)
                .lineStyle(3, 0x000000)
                .drawRoundedRect(0, 0, (this.handlePoint / 100) * this.rangeLength, this.rangeHeight, radius);
            //console.log(this.handlePoint);
            //this.stage.update();
        };
        const handleUp = (event: PIXI.InteractionEvent): void => {
            const target: DragObject = event.currentTarget as DragObject;
            //if (target.dragging === false) return;
            target.dragging = false;
            const mousePoint = this.underBar.toLocal(event.data.global);
            const xPoint = mousePoint.x - (this.dragPointX as number);
            if (xPoint >= 0 && xPoint <= this.rangeLength) {
                //this.handle.x = xPoint;
                this.handle.x = (Math.round((xPoint / this.rangeLength) * max) / max) * this.rangeLength;
            } else if (xPoint < 0) {
                this.handle.x = 0;
            } else if (xPoint > this.rangeLength) {
                this.handle.x = this.rangeLength;
            }
            this.handlePoint = (this.handle.x / this.rangeLength) * 100;
            //this.handlePoint = (this.handle.x / this.rangeLength) * 100;
            this.step = Math.round(this.max * (this.handlePoint / 100));
            this.upBar.clear();
            this.upBar
                .beginFill(0x00bfff)
                .drawRoundedRect(0, 0, (this.rangeLength * this.handlePoint) / 100, this.rangeHeight, radius)
                .lineStyle(3, 0x000000)
                .drawRoundedRect(0, 0, (this.handlePoint / 100) * this.rangeLength, this.rangeHeight, radius);
            /*
            if (this.handlePoint < 0.5) {
                this.handlePoint = 0;
            } else if (this.handlePoint > 99.5) {
                this.handlePoint = 100;
            } else {
                this.handlePoint = this.handlePoint * (100 / 99);
                if (this.handlePoint > 100) {
                    this.handlePoint = 100;
                }
            }
            */
            //this.stage.update();
        };

        this.handle.on("pointerdown", handleDown).on("pointerup", handleUp).on("pointerupoutside", handleUp).on("pointermove", handleMove);
        this.handle.interactive = true;
        this.range.addChild(this.handle);
        //console.log(this.handle.globalToLocal);

        this.range.pivot.set(this.rangeLength / 2, this.rangeHeight / 2);
    }
    addEventListener(event: RangeEvent, listner: () => any): () => any {
        switch (event) {
            case "move":
                this.handle.on("pointermove", listner);
                this.range.on("click", listner);
                //this.underBar.addEventListener("click", listner);
                //this.upBar.addEventListener("click", listner);
                return listner;
            case "pressup":
                this.handle.on("pointerup", listner);
                return listner;
            case "change":
                const tmp = () => {
                    if (this.beforeStep !== this.step) {
                        listner();
                        this.beforeStep = this.step;
                    }
                };
                this.handle.on("pointermove", tmp);
                this.underBar.on("click", tmp);
                this.upBar.on("click", tmp);
                this.range.on("click", tmp);
                return tmp;
        }
    }
}

// export class ImageContainer {
//     private stage: createjs.Stage;
//     private width: number;
//     private height: number;
//     public quantity: number | null;
//     public readonly container: createjs.Container;
//     //public src: string;
//     private baseImageW: number | null;
//     private baseImageH: number | null;
//     private preImage: HTMLImageElement;
//     private baseImage: createjs.Bitmap;
//     //public max: number;
//     private diffW: number;
//     private diffH: number;
//     private lineMax: number;
//     // private beforeImages: createjs.Bitmap[];
//     // private currentImages: createjs.Bitmap[];

//     constructor(stage: createjs.Stage, width: number, height: number, diffW: number, diffH: number, src: string, lineMax?: number) {
//         this.stage = stage;
//         this.width = width;
//         this.height = height;
//         this.diffW = diffW;
//         this.diffH = diffH;
//         this.quantity = null;
//         //this.max = height;
//         //this.src = src;
//         this.baseImageW = null;
//         this.baseImageH = null;
//         this.lineMax = lineMax ?? 100;
//         if (this.lineMax < 1) {
//             throw new Error("Invalid Auguments");
//         }

//         this.container = new createjs.Container();

//         this.container.regX = this.width / 2;
//         this.container.regY = this.height / 2;
//         this.preImage = new Image();
//         this.preImage.src = src;
//         this.baseImage = new createjs.Bitmap(this.preImage);
//         this.baseImage.visible = false;
//         this.preImage.addEventListener("load", (event: Event) => {
//             const preImage = event.target as HTMLImageElement;
//             this.baseImageW = preImage.width;
//             this.baseImageH = preImage.height;
//         });

//         // this.beforeImages = [];
//         // this.currentImages = [];

//         /*const photo = makeImage("./foodImgs/0001_パクチー入りフォー.jpg", 30, 30);
//         this.stage.addChild(photo);
//         photo.x = 200;
//         photo.y = 200;*/
//     }
//     // makeImage = (src: string, width: number, height: number, index: number): createjs.Bitmap => {
//     //     const preImage = new Image();
//     //     preImage.src = src;
//     //     const image = new createjs.Bitmap(preImage);
//     //     image.visible = false;
//     //     preImage.addEventListener("load", (event: Event) => {
//     //         const preImage = event.target as HTMLImageElement;
//     //         image.scaleX = width / preImage.width;
//     //         image.scaleY = height / preImage.height;
//     //         this.container.addChild(image);
//     //         image.visible = true;
//     //         this.stage.update();
//     //         this.quantity += 1;
//     //     });
//     //     return image;
//     // };
//     copyImage = (width: number, height: number): createjs.Bitmap => {
//         const image = this.baseImage.clone();
//         if (this.baseImageW != null && this.baseImageH != null) {
//             image.scaleX = width / this.baseImageW;
//             image.scaleY = height / this.baseImageH;
//             image.visible = true;
//             return image;
//         } else {
//             this.preImage.addEventListener("load", (event: Event) => {
//                 const preImage = event.target as HTMLImageElement;
//                 image.scaleX = width / preImage.width;
//                 image.scaleY = height / preImage.height;
//                 image.visible = true;
//                 this.stage.update();
//             });
//             return image;
//         }
//     };

//     updateContainer = (quantity: number) => {
//         this.quantity = quantity;
//         this.container.removeAllChildren();
//         const back = new createjs.Shape();
//         back.graphics.beginFill("#FFFFFF").drawRect(0, 0, this.width, this.height);
//         back.alpha = 0.006; //0.005882352829;//透明で反応させる
//         this.container.addChild(back);
//         this.stage.update();
//         //this.max = max;
//         if (quantity > this.lineMax) {
//             const imageWRatio = 100 / (this.lineMax / 10); //画像の割合、10を基準に枚数少なければ細く、多ければ広くする
//             const imageHRatio = 100;
//             const diffW: number = this.diffW; //重なり部分の割合
//             const diffH: number = this.diffH;
//             const baseW = this.width / (imageWRatio * this.lineMax - diffW * (this.lineMax - 1)); //横単位、横は常にlineMaxで固定する
//             const baseH = this.height / (imageHRatio * quantity - diffH * (quantity - 1)); //縦単位、縦はMaxで可変
//             const imageW = baseW * imageWRatio; //画像のピクセル数
//             const imageH = baseH * imageHRatio; //this.lineMax > 10 ? baseH * 100 : baseH * 100 * (this.lineMax / 10); //linemax < 10　の時画像が縦に重なるのを回避
//             const placeW = baseW * (imageWRatio - diffW); //画像の重なりのピクセル数
//             const placeH = baseH * (imageHRatio - diffH); //this.lineMax > 10 ? (baseH * (100 - diffH)) / (this.lineMax / 10) : baseH * (100 - diffH); //linemax > 10 のとき間が開きすぎするのを回避
//             let offsetX = 0; //横lineMaxに達したら左にずらすオフセット

//             for (let i = 0; i < quantity; i++) {
//                 if (i % this.lineMax === 0 && i !== 0) {
//                     //offsetY += 0 * placeH;
//                     offsetX -= this.lineMax * placeW;
//                     //placeW = baseW * (i / 10 + 1) * (100 - diffW);
//                 }
//                 // if ((i + 1) % this.lineMax === 0 && i === max - 1) {
//                 //     console.log({
//                 //         max: max,
//                 //         sita: imageHRatio * max - diffH * (max - 1),
//                 //         height: this.height,
//                 //         imageHratio: imageHRatio,
//                 //         diffH: this.diffH,
//                 //         baseH: baseH,
//                 //         imageH: imageH,
//                 //         placeH: placeH,
//                 //         size: (placeH / baseH) * i + imageHRatio,
//                 //         y: placeH * i + imageH,
//                 //     });
//                 // }
//                 const image = this.copyImage(imageW, imageH);
//                 //this.currentImages.push(image);
//                 image.x += placeW * i + offsetX;
//                 image.y += placeH * i;
//                 this.container.addChild(image);
//                 this.stage.update();
//             }
//         }
//         // if (max > 1) {
//         //     this.container.removeAllChildren();
//         //     const baseW = this.width / (100 * max - diffW * (max - 1));
//         //     const baseH = this.width / (100 * max - diffH * (max - 1));
//         //     const imageW = baseW * 100;
//         //     const imageH = baseH * 100;
//         //     const placeW = baseW * (100 - diffW);
//         //     const placeH = baseH * (100 - diffH);
//         //     let offsetX = 0;
//         //     let offsetY = 0;

//         //     for (let i = 0; i < max; i++) {
//         //         if (i % 10 === 0 && i !== 0) {
//         //             //offsetY += 0 * placeH;
//         //             offsetX -= 10 * placeW;
//         //         }
//         //         const image = this.copyImage(imageW, imageH);
//         //         //this.currentImages.push(image);
//         //         image.x += placeW * i + offsetX;
//         //         image.y += placeH * i + offsetY;
//         //         this.container.addChild(image);
//         //         this.stage.update();
//         //     }
//         // }
//         if (quantity > 1 && quantity < this.lineMax + 1) {
//             const imageWRatio = 100 / (this.lineMax / 10);
//             const imageHRatio = 100;
//             const diffW: number = this.diffW;
//             const diffH: number = this.diffH;
//             const baseW = this.width / (imageWRatio * quantity - diffW * (quantity - 1));
//             const baseH = this.height / (imageHRatio * quantity - diffH * (quantity - 1));
//             const imageW = baseW * imageWRatio;
//             const imageH = baseH * imageHRatio;
//             const placeW = baseW * (imageWRatio - diffW);
//             const placeH = baseH * (imageHRatio - diffH);

//             for (let i = 0; i < quantity; i++) {
//                 const image = this.copyImage(imageW, imageH);
//                 //this.currentImages.push(image);
//                 image.x += placeW * i;
//                 image.y += placeH * i;
//                 this.container.addChild(image);
//                 this.stage.update();
//             }
//         } else if (quantity === 1) {
//             const wh = this.width > this.height ? this.height : this.width;
//             const image = this.copyImage(wh, wh);
//             image.x = 0;
//             image.y = 0;
//             this.container.addChild(image);
//             this.stage.update();
//             //this.currentImages.push(image);
//         }
//     };

//     addEventListener(event: "click", listner: () => any): () => any {
//         switch (event) {
//             case "click":
//                 this.container.addEventListener("click", listner);
//                 //this.underBar.addEventListener("click", listner);
//                 //this.upBar.addEventListener("click", listner);
//                 return listner;
//         }
//     }
// }
