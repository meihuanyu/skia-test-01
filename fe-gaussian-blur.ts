// 本算法根据 w3 关于 feGaussianBlur 的描述实现
// @see https://www.w3.org/TR/SVG11/filters.html#feGaussianBlurElement

export function feGaussianBlur(
  src: any,
  width: any,
  height: any,
  radiusX: any,
  radiusY = radiusX,
) {
  if (!width || !height) return
  if (!radiusX && !radiusY) return

  const sizeX = getSize(radiusX)
  const sizeY = getSize(radiusY)

  if (!sizeX && !sizeY) return

  const tmp = new Uint8ClampedArray(src.length)

  const groups = [{
    input: src,
    output: tmp,
    size: sizeX,
    w: width,
    h: height,
  }, {
    input: tmp,
    output: src,
    size: sizeY,
    w: height,
    h: width,
  }]

  for (const { input, output, size, w, h } of groups) {
    if (size) {
      if (size % 2) {
        const length = (size - 1) / 2
        convoluteLine(input, output, w, h, length, length)
      } else {
        const length = size / 2
        convoluteLine(input, output, w, h, length, length - 1)
      }
    } else {
      transpose(input, output, w, h)
    }
  }

  for (const { input, output, size, w, h } of groups) {
    if (size) {
      if (size % 2) {
        const length = (size - 1) / 2
        convoluteLine(input, output, w, h, length, length)
      } else {
        const length = size / 2
        convoluteLine(input, output, w, h, length - 1, length)
      }
    } else {
      transpose(input, output, w, h)
    }
  }

  for (const { input, output, size, w, h } of groups) {
    if (size) {
      const length = size % 2 ? (size - 1) / 2 : size / 2
      convoluteLine(input, output, w, h, length, length)
    } else {
      transpose(input, output, w, h)
    }
  }
}

function getSize(s: any) {
  // d = floor(s * 3*sqrt(2*pi)/4 + 0.5)
  return Math.floor(s * 3 * Math.sqrt(2 * Math.PI) / 4 + 0.5)
}

function convoluteLine(
  src: any,
  dest: any,
  width: any,
  height: any,
  leftLength: any,
  rightLength: any,
) {
  const leftLengthPlus1 = leftLength + 1
  const leftLengthPlus14 = leftLengthPlus1 * 4
  const extraLength = leftLength + rightLength
  const slidingLength = extraLength + 1
  const slidingLength4 = slidingLength * 4
  const silidingWidth = width + slidingLength
  const silidingWidth4 = silidingWidth * 4
  const width4 = width * 4

  for (let i = 0; i < height; i++) {
    const rowIndex = i * width4
    const extraLine = new Uint8ClampedArray(silidingWidth4)

    // 从源图填充内容区域
    for (let k = 0; k < width4; k++) {
      extraLine[k + leftLengthPlus14] = src[rowIndex + k]
    }

    // 对于完全透明的像素点进行色彩插值.
    // 这一动作未能在文档里找到, 但实际存在
    {
      let startIndex = 0

      // 寻找下一个不透明点
      for (; startIndex < silidingWidth4; startIndex += 4) {
        if (extraLine[startIndex + 3]) break
      }

      // 如果透明点不在第一个的话, 以不透明点的颜色填充之前的像素点
      if (startIndex) {
        const r = extraLine[startIndex]
        const g = extraLine[startIndex + 1]
        const b = extraLine[startIndex + 2]
        for (let index = 0; index < startIndex; index += 4) {
          extraLine[index] = r
          extraLine[index + 1] = g
          extraLine[index + 2] = b
        }
      }

      while (startIndex < silidingWidth4) {
        // 寻找下一个不透明点
        for (; startIndex < silidingWidth4; startIndex += 4) {
          if (extraLine[startIndex + 3]) break
        }

        let endIndex = startIndex + 4

        // 寻找下一个不透明点
        for (; endIndex < silidingWidth4; endIndex += 4) {
          if (extraLine[endIndex + 3]) break
        }

        if (endIndex >= silidingWidth4) {
          // 超区了, 以之前的不透明点填充之后的像素点
          const r = extraLine[startIndex]
          const g = extraLine[startIndex + 1]
          const b = extraLine[startIndex + 2]
          for (let index = startIndex; index < silidingWidth4; index += 4) {
            extraLine[index] = r
            extraLine[index + 1] = g
            extraLine[index + 2] = b
          }
          break
        }

        const T = endIndex - startIndex

        // 两个不透明点间存在透明点, 进行线性插值
        if (T > 4) {
          const r1 = extraLine[startIndex]
          const g1 = extraLine[startIndex + 1]
          const b1 = extraLine[startIndex + 2]

          const r2 = extraLine[endIndex]
          const g2 = extraLine[endIndex + 1]
          const b2 = extraLine[endIndex + 2]

          const r0 = r1 - (r2 - r1) * startIndex / T
          const rk = (r2 - r1) / T

          const g0 = g1 - (g2 - g1) * startIndex / T
          const gk = (g2 - g1) / T

          const b0 = b1 - (b2 - b1) * startIndex / T
          const bk = (b2 - b1) / T

          for (let index = startIndex + 4; index < endIndex; index += 4) {
            // r1 + (r2 - r1) * (index - startIndex) / T
            extraLine[index] = r0 + rk * index
            extraLine[index + 1] = g0 + gk * index
            extraLine[index + 2] = b0 + bk * index
          }
        }

        startIndex = endIndex
      }
    }

    let prevSumR = 0
    let prevSumG = 0
    let prevSumB = 0
    let prevSumA = 0

    // 计算初始卷积值

    for (let offset = 0; offset < slidingLength4; offset += 4) {
      prevSumR += extraLine[offset]
      prevSumG += extraLine[offset + 1]
      prevSumB += extraLine[offset + 2]
      prevSumA += extraLine[offset + 3]
    }

    // 卷积

    for (let j = 0; j < width; j++) {
      const offset = j * 4
      const inOffset = offset + slidingLength4
      prevSumR += extraLine[inOffset] - extraLine[offset]
      prevSumG += extraLine[inOffset + 1] - extraLine[offset + 1]
      prevSumB += extraLine[inOffset + 2] - extraLine[offset + 2]
      prevSumA += extraLine[inOffset + 3] - extraLine[offset + 3]

      // 卷积到置换矩阵 (即横纵坐标交换)
      const destOffset = 4 * (j * height + i)
      dest[destOffset] = prevSumR / slidingLength
      dest[destOffset + 1] = prevSumG / slidingLength
      dest[destOffset + 2] = prevSumB / slidingLength
      dest[destOffset + 3] = prevSumA / slidingLength
    }
  }
}

// 转置矩阵 (即横纵坐标交换)
function transpose(
  src: Uint8ClampedArray,
  dest: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const width4 = width * 4
  for (let i = 0; i < height; i++) {
    const rowIndex = i * width4
    for (let j = 0; j < width; j++) {
      const srcOffset = rowIndex + j * 4
      const destOffset = 4 * (j * height + i)
      dest[destOffset] = src[srcOffset]
      dest[destOffset + 1] = src[srcOffset + 1]
      dest[destOffset + 2] = src[srcOffset + 2]
      dest[destOffset + 3] = src[srcOffset + 3]
    }
  }
}

export function  fillTile(
  ctx: any,
    /**
     * 纹理源
     */
    img: any,
    /**
     * 填充矩形的区域的横向偏移
     */
    x: any,
    /**
     * 填充矩形的区域的纵向偏移
     */
    y: any,
    /**
     * 填充矩形的区域的宽
     */
    w: any,
    /**
     * 填充矩形的区域的高
     */
    h: any,
    /**
     * 纹理图片选取部分的左上角(起始点)横坐标
     */
    cx: any,
    /**
     * 纹理图片选取部分的左上角(起始点)纵坐标
     */
    cy: any,
    /**
     * 纹理图片选取部分的宽
     */
    cw: any,
    /**
     * 纹理图片选取部分的高
     */
    ch: any,
    /**
     * 平铺起始点横坐标(左上角对左上角)
     */
    bx: any,
    /**
     * 平铺起始点纵坐标(左上角对左上角)
     */
    by: any,
    /**
     * 纹理的平铺宽度
     */
    bw: any,
    /**
     * 纹理的平铺高度
     */
    bh: any,
  ) {
    if (!bw || !bh) return

    ctx.save()

    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()

    const [startI, endI] = calculateTileI(bx, bw, w)
    const [startJ, endJ] = calculateTileI(bx, bw, w)

    for (let i = startI; i <= endI; i++) {
      const offsetX = i * bw
      for (let j = startJ; j <= endJ; j++) {
        const offsetY = j * bh
        ctx.drawImage(
          img,
          cx, cy, cw, ch,
          bx + offsetX, by + offsetY, bw, bh,
        )
      }
    }

    ctx.restore()
  }
  function calculateTileI(bx: any, bw: any, w: any) {
  const startI = ((bx % bw) - bw) % bw
  const endI = Math.ceil((w - bx) / bw)
  return [startI, endI]
}

