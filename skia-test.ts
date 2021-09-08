import { Canvas } from "skia-canvas";
import * as fs from "fs";
import { feGaussianBlur } from "./fe-gaussian-blur";
const w1 = 1000;
const h1 = 120;

async function main() {
    const c1 = await result();
    // @ts-ignore
    c1.toBuffer("image/png").then((buffer: any) => {
        fs.writeFile("ts.png", buffer, { flag: "w" }, () => {});
    });
}

main();

function result() {
    const mainCanvas = new Canvas(2100, 500);
    const mainCtx = mainCanvas.getContext("2d");

    {
        mainCtx.save();
        mainCtx.translate(0, 0);
        const color = "blue";
        // 创建子画板
        const canvas = new Canvas(w1, h1);
        const ctx = canvas.getContext("2d");

        ctx.save();
        ctx.fillStyle = `${color}`;
        ctx.fillRect(0, 0, w1, h1);
        ctx.restore();

        // 高斯模糊
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        feGaussianBlur(data.data, data.width, data.height, 10);

        // @ts-ignore
        ctx.putImageData(data, 0, 0);

        // @ts-ignore
        mainCtx.drawImage(canvas, 2, 4, w1, h1);
        mainCtx.restore();
    }

    {
        // 创建子画板
        const canvas = new Canvas(1000, 1000);
        const ctx = canvas.getContext("2d");

        // 高斯模糊
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        feGaussianBlur(data.data, data.width, data.height, 10);
    }

    {
        mainCtx.save();
        mainCtx.translate(w1, 140);
        const canvas = new Canvas(w1, h1);
        const ctx = canvas.getContext("2d");

        ctx.save();
        ctx.fillStyle = "green";
        ctx.fillRect(0, 0, w1, h1);
        ctx.restore();

        // 高斯模糊
        const data = ctx.getImageData(0, 0, canvas.width, h1 * 0.6);
        feGaussianBlur(data.data, data.width, data.height, 10);

        // 绘画到父画板
        // @ts-ignore
        mainCtx.drawImage(canvas, 2, 2, w1, h1);
        mainCtx.restore();
    }

    return mainCanvas;
}