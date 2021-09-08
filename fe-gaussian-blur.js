"use strict";
// 本算法根据 w3 关于 feGaussianBlur 的描述实现
// @see https://www.w3.org/TR/SVG11/filters.html#feGaussianBlurElement
exports.__esModule = true;
exports.fillTile = exports.feGaussianBlur = void 0;
function feGaussianBlur(src, width, height, radiusX, radiusY) {
    if (radiusY === void 0) { radiusY = radiusX; }
    if (!width || !height)
        return;
    if (!radiusX && !radiusY)
        return;
    var sizeX = getSize(radiusX);
    var sizeY = getSize(radiusY);
    if (!sizeX && !sizeY)
        return;
    var tmp = new Uint8ClampedArray(src.length);
    var groups = [{
            input: src,
            output: tmp,
            size: sizeX,
            w: width,
            h: height
        }, {
            input: tmp,
            output: src,
            size: sizeY,
            w: height,
            h: width
        }];
    for (var _i = 0, groups_1 = groups; _i < groups_1.length; _i++) {
        var _a = groups_1[_i], input = _a.input, output = _a.output, size = _a.size, w = _a.w, h = _a.h;
        if (size) {
            if (size % 2) {
                var length_1 = (size - 1) / 2;
                convoluteLine(input, output, w, h, length_1, length_1);
            }
            else {
                var length_2 = size / 2;
                convoluteLine(input, output, w, h, length_2, length_2 - 1);
            }
        }
        else {
            transpose(input, output, w, h);
        }
    }
    for (var _b = 0, groups_2 = groups; _b < groups_2.length; _b++) {
        var _c = groups_2[_b], input = _c.input, output = _c.output, size = _c.size, w = _c.w, h = _c.h;
        if (size) {
            if (size % 2) {
                var length_3 = (size - 1) / 2;
                convoluteLine(input, output, w, h, length_3, length_3);
            }
            else {
                var length_4 = size / 2;
                convoluteLine(input, output, w, h, length_4 - 1, length_4);
            }
        }
        else {
            transpose(input, output, w, h);
        }
    }
    for (var _d = 0, groups_3 = groups; _d < groups_3.length; _d++) {
        var _e = groups_3[_d], input = _e.input, output = _e.output, size = _e.size, w = _e.w, h = _e.h;
        if (size) {
            var length_5 = size % 2 ? (size - 1) / 2 : size / 2;
            convoluteLine(input, output, w, h, length_5, length_5);
        }
        else {
            transpose(input, output, w, h);
        }
    }
}
exports.feGaussianBlur = feGaussianBlur;
function getSize(s) {
    // d = floor(s * 3*sqrt(2*pi)/4 + 0.5)
    return Math.floor(s * 3 * Math.sqrt(2 * Math.PI) / 4 + 0.5);
}
function convoluteLine(src, dest, width, height, leftLength, rightLength) {
    var leftLengthPlus1 = leftLength + 1;
    var leftLengthPlus14 = leftLengthPlus1 * 4;
    var extraLength = leftLength + rightLength;
    var slidingLength = extraLength + 1;
    var slidingLength4 = slidingLength * 4;
    var silidingWidth = width + slidingLength;
    var silidingWidth4 = silidingWidth * 4;
    var width4 = width * 4;
    for (var i = 0; i < height; i++) {
        var rowIndex = i * width4;
        var extraLine = new Uint8ClampedArray(silidingWidth4);
        // 从源图填充内容区域
        for (var k = 0; k < width4; k++) {
            extraLine[k + leftLengthPlus14] = src[rowIndex + k];
        }
        // 对于完全透明的像素点进行色彩插值.
        // 这一动作未能在文档里找到, 但实际存在
        {
            var startIndex = 0;
            // 寻找下一个不透明点
            for (; startIndex < silidingWidth4; startIndex += 4) {
                if (extraLine[startIndex + 3])
                    break;
            }
            // 如果透明点不在第一个的话, 以不透明点的颜色填充之前的像素点
            if (startIndex) {
                var r = extraLine[startIndex];
                var g = extraLine[startIndex + 1];
                var b = extraLine[startIndex + 2];
                for (var index = 0; index < startIndex; index += 4) {
                    extraLine[index] = r;
                    extraLine[index + 1] = g;
                    extraLine[index + 2] = b;
                }
            }
            while (startIndex < silidingWidth4) {
                // 寻找下一个不透明点
                for (; startIndex < silidingWidth4; startIndex += 4) {
                    if (extraLine[startIndex + 3])
                        break;
                }
                var endIndex = startIndex + 4;
                // 寻找下一个不透明点
                for (; endIndex < silidingWidth4; endIndex += 4) {
                    if (extraLine[endIndex + 3])
                        break;
                }
                if (endIndex >= silidingWidth4) {
                    // 超区了, 以之前的不透明点填充之后的像素点
                    var r = extraLine[startIndex];
                    var g = extraLine[startIndex + 1];
                    var b = extraLine[startIndex + 2];
                    for (var index = startIndex; index < silidingWidth4; index += 4) {
                        extraLine[index] = r;
                        extraLine[index + 1] = g;
                        extraLine[index + 2] = b;
                    }
                    break;
                }
                var T = endIndex - startIndex;
                // 两个不透明点间存在透明点, 进行线性插值
                if (T > 4) {
                    var r1 = extraLine[startIndex];
                    var g1 = extraLine[startIndex + 1];
                    var b1 = extraLine[startIndex + 2];
                    var r2 = extraLine[endIndex];
                    var g2 = extraLine[endIndex + 1];
                    var b2 = extraLine[endIndex + 2];
                    var r0 = r1 - (r2 - r1) * startIndex / T;
                    var rk = (r2 - r1) / T;
                    var g0 = g1 - (g2 - g1) * startIndex / T;
                    var gk = (g2 - g1) / T;
                    var b0 = b1 - (b2 - b1) * startIndex / T;
                    var bk = (b2 - b1) / T;
                    for (var index = startIndex + 4; index < endIndex; index += 4) {
                        // r1 + (r2 - r1) * (index - startIndex) / T
                        extraLine[index] = r0 + rk * index;
                        extraLine[index + 1] = g0 + gk * index;
                        extraLine[index + 2] = b0 + bk * index;
                    }
                }
                startIndex = endIndex;
            }
        }
        var prevSumR = 0;
        var prevSumG = 0;
        var prevSumB = 0;
        var prevSumA = 0;
        // 计算初始卷积值
        for (var offset = 0; offset < slidingLength4; offset += 4) {
            prevSumR += extraLine[offset];
            prevSumG += extraLine[offset + 1];
            prevSumB += extraLine[offset + 2];
            prevSumA += extraLine[offset + 3];
        }
        // 卷积
        for (var j = 0; j < width; j++) {
            var offset = j * 4;
            var inOffset = offset + slidingLength4;
            prevSumR += extraLine[inOffset] - extraLine[offset];
            prevSumG += extraLine[inOffset + 1] - extraLine[offset + 1];
            prevSumB += extraLine[inOffset + 2] - extraLine[offset + 2];
            prevSumA += extraLine[inOffset + 3] - extraLine[offset + 3];
            // 卷积到置换矩阵 (即横纵坐标交换)
            var destOffset = 4 * (j * height + i);
            dest[destOffset] = prevSumR / slidingLength;
            dest[destOffset + 1] = prevSumG / slidingLength;
            dest[destOffset + 2] = prevSumB / slidingLength;
            dest[destOffset + 3] = prevSumA / slidingLength;
        }
    }
}
// 转置矩阵 (即横纵坐标交换)
function transpose(src, dest, width, height) {
    var width4 = width * 4;
    for (var i = 0; i < height; i++) {
        var rowIndex = i * width4;
        for (var j = 0; j < width; j++) {
            var srcOffset = rowIndex + j * 4;
            var destOffset = 4 * (j * height + i);
            dest[destOffset] = src[srcOffset];
            dest[destOffset + 1] = src[srcOffset + 1];
            dest[destOffset + 2] = src[srcOffset + 2];
            dest[destOffset + 3] = src[srcOffset + 3];
        }
    }
}
function fillTile(ctx, 
/**
 * 纹理源
 */
img, 
/**
 * 填充矩形的区域的横向偏移
 */
x, 
/**
 * 填充矩形的区域的纵向偏移
 */
y, 
/**
 * 填充矩形的区域的宽
 */
w, 
/**
 * 填充矩形的区域的高
 */
h, 
/**
 * 纹理图片选取部分的左上角(起始点)横坐标
 */
cx, 
/**
 * 纹理图片选取部分的左上角(起始点)纵坐标
 */
cy, 
/**
 * 纹理图片选取部分的宽
 */
cw, 
/**
 * 纹理图片选取部分的高
 */
ch, 
/**
 * 平铺起始点横坐标(左上角对左上角)
 */
bx, 
/**
 * 平铺起始点纵坐标(左上角对左上角)
 */
by, 
/**
 * 纹理的平铺宽度
 */
bw, 
/**
 * 纹理的平铺高度
 */
bh) {
    if (!bw || !bh)
        return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    var _a = calculateTileI(bx, bw, w), startI = _a[0], endI = _a[1];
    var _b = calculateTileI(bx, bw, w), startJ = _b[0], endJ = _b[1];
    for (var i = startI; i <= endI; i++) {
        var offsetX = i * bw;
        for (var j = startJ; j <= endJ; j++) {
            var offsetY = j * bh;
            ctx.drawImage(img, cx, cy, cw, ch, bx + offsetX, by + offsetY, bw, bh);
        }
    }
    ctx.restore();
}
exports.fillTile = fillTile;
function calculateTileI(bx, bw, w) {
    var startI = ((bx % bw) - bw) % bw;
    var endI = Math.ceil((w - bx) / bw);
    return [startI, endI];
}
