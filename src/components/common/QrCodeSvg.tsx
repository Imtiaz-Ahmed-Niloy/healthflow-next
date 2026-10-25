"use client";

import React, { useMemo } from "react";

export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export interface QrCodeSvgProps extends React.SVGProps<SVGSVGElement> {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  level?: QrErrorCorrectionLevel;
  includeMargin?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Pure TypeScript QR Code Matrix Generator (ISO/IEC 18004 compliant)
// ---------------------------------------------------------------------------

type EccInfo = { ordinal: number; formatBits: number };

const ECC_LEVELS: Record<QrErrorCorrectionLevel, EccInfo> = {
  L: { ordinal: 0, formatBits: 1 },
  M: { ordinal: 1, formatBits: 0 },
  Q: { ordinal: 2, formatBits: 3 },
  H: { ordinal: 3, formatBits: 2 },
};

const ECC_CODEWORDS_PER_BLOCK: number[][] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

const NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 72, 74, 77],
];

class ReedSolomonGenerator {
  private readonly degree: number;
  private readonly poly: number[];
  private static readonly EXP: Uint8Array = new Uint8Array(256);
  private static readonly LOG: Uint8Array = new Uint8Array(256);
  private static initialized = false;

  private static initTables() {
    if (this.initialized) return;
    for (let i = 0, x = 1; i < 256; i++) {
      this.EXP[i] = x;
      this.LOG[x] = i;
      x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
    }
    this.initialized = true;
  }

  constructor(degree: number) {
    ReedSolomonGenerator.initTables();
    this.degree = degree;
    let poly = [1];
    for (let i = 0; i < degree; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= this.multiply(poly[j], ReedSolomonGenerator.EXP[i]);
        next[j + 1] ^= poly[j];
      }
      poly = next;
    }
    this.poly = poly;
  }

  private multiply(x: number, y: number): number {
    if (x === 0 || y === 0) return 0;
    return ReedSolomonGenerator.EXP[(ReedSolomonGenerator.LOG[x] + ReedSolomonGenerator.LOG[y]) % 255];
  }

  public getRemainder(data: Uint8Array): Uint8Array {
    const res = new Uint8Array(this.degree);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ res[0];
      for (let j = 0; j < this.degree - 1; j++) {
        res[j] = res[j + 1] ^ this.multiply(this.poly[this.degree - 1 - j], factor);
      }
      res[this.degree - 1] = this.multiply(this.poly[0], factor);
    }
    return res;
  }
}

class QrGenerator {
  public readonly version: number;
  public readonly size: number;
  public readonly modules: boolean[][];
  private readonly isFunction: boolean[][];
  private readonly errorCorrectionLevel: EccInfo;

  public static encode(text: string, level: QrErrorCorrectionLevel): QrGenerator {
    const bytes = new TextEncoder().encode(text);
    const ecl = ECC_LEVELS[level];

    for (let version = 1; version <= 40; version++) {
      const dataCapacityBits = QrGenerator.getNumDataCodewords(version, ecl) * 8;
      const headerBits = 4 + (version < 10 ? 8 : 16);
      if (headerBits + bytes.length * 8 <= dataCapacityBits) {
        return new QrGenerator(version, ecl, bytes);
      }
    }
    throw new Error("Data too large for QR Code");
  }

  constructor(version: number, ecl: EccInfo, data: Uint8Array) {
    this.version = version;
    this.errorCorrectionLevel = ecl;
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
    this.isFunction = Array.from({ length: this.size }, () => new Array(this.size).fill(false));

    this.drawFunctionPatterns();
    const allCodewords = this.addEccAndInterleave(data);
    this.drawCodewords(allCodewords);
    const mask = this.handleMasking();
    this.drawFormatBits(mask);
  }

  private drawFunctionPatterns() {
    const size = this.size;
    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(size - 4, 3);
    this.drawFinderPattern(3, size - 4);

    for (let i = 0; i < size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }

    const alignPos = QrGenerator.getAlignmentPatternPositions(this.version);
    for (let i = 0; i < alignPos.length; i++) {
      for (let j = 0; j < alignPos.length; j++) {
        if (
          (i === 0 && j === 0) ||
          (i === 0 && j === alignPos.length - 1) ||
          (i === alignPos.length - 1 && j === 0)
        ) {
          continue;
        }
        this.drawAlignmentPattern(alignPos[i], alignPos[j]);
      }
    }

    for (let i = 0; i < 9; i++) {
      this.setFunctionModule(8, i, false);
      this.setFunctionModule(i, 8, false);
    }
    for (let i = 0; i < 8; i++) {
      this.setFunctionModule(8, size - 1 - i, false);
      this.setFunctionModule(size - 1 - i, 8, false);
    }
    this.setFunctionModule(8, size - 8, true);
  }

  private drawFinderPattern(x: number, y: number) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < this.size && py >= 0 && py < this.size) {
          this.setFunctionModule(px, py, dist !== 2 && dist !== 4);
        }
      }
    }
  }

  private drawAlignmentPattern(x: number, y: number) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  private setFunctionModule(x: number, y: number, isDark: boolean) {
    this.modules[y][x] = isDark;
    this.isFunction[y][x] = true;
  }

  private addEccAndInterleave(data: Uint8Array): number[] {
    const numDataCodewords = QrGenerator.getNumDataCodewords(this.version, this.errorCorrectionLevel);
    const bb: number[] = [];
    bb.push(0, 1, 0, 0); // Byte mode

    const countBits = this.version < 10 ? 8 : 16;
    for (let i = countBits - 1; i >= 0; i--) {
      bb.push((data.length >>> i) & 1);
    }
    for (const b of data) {
      for (let i = 7; i >= 0; i--) {
        bb.push((b >>> i) & 1);
      }
    }
    const capacityBits = numDataCodewords * 8;
    for (let i = 0; i < 4 && bb.length < capacityBits; i++) {
      bb.push(0);
    }
    while (bb.length % 8 !== 0) {
      bb.push(0);
    }
    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    while (bb.length < capacityBits) {
      const pb = padBytes[padIdx % 2];
      for (let i = 7; i >= 0; i--) {
        bb.push((pb >>> i) & 1);
      }
      padIdx++;
    }

    const dataCodewords = new Uint8Array(numDataCodewords);
    for (let i = 0; i < numDataCodewords; i++) {
      let byte = 0;
      for (let j = 0; j < 8; j++) {
        byte = (byte << 1) | bb[i * 8 + j];
      }
      dataCodewords[i] = byte;
    }

    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[this.errorCorrectionLevel.ordinal][this.version];
    const blockEcLen = ECC_CODEWORDS_PER_BLOCK[this.errorCorrectionLevel.ordinal][this.version];
    const rawCodewords = QrGenerator.getNumRawDataModules(this.version) / 8;
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);

    const blocksData: Uint8Array[] = [];
    const blocksEcc: Uint8Array[] = [];
    const rs = new ReedSolomonGenerator(blockEcLen);

    let k = 0;
    for (let i = 0; i < numBlocks; i++) {
      const dataLen = shortBlockLen - blockEcLen + (i >= numShortBlocks ? 1 : 0);
      const bData = dataCodewords.slice(k, k + dataLen);
      k += dataLen;
      blocksData.push(bData);
      blocksEcc.push(rs.getRemainder(bData));
    }

    const result: number[] = [];
    const maxDataLen = blocksData[blocksData.length - 1].length;
    for (let i = 0; i < maxDataLen; i++) {
      for (let j = 0; j < numBlocks; j++) {
        if (i < blocksData[j].length) {
          result.push(blocksData[j][i]);
        }
      }
    }
    for (let i = 0; i < blockEcLen; i++) {
      for (let j = 0; j < numBlocks; j++) {
        result.push(blocksEcc[j][i]);
      }
    }
    return result;
  }

  private drawCodewords(allCodewords: number[]) {
    const size = this.size;
    let bitIndex = 0;
    for (let right = size - 1; right > 0; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (!this.isFunction[y][x]) {
            let dark = false;
            if (bitIndex < allCodewords.length * 8) {
              dark = ((allCodewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
              bitIndex++;
            }
            this.modules[y][x] = dark;
          }
        }
      }
    }
  }

  private handleMasking(): number {
    let bestMask = 0;
    let minPenalty = Infinity;

    for (let mask = 0; mask < 8; mask++) {
      this.applyMask(mask);
      this.drawFormatBits(mask);
      const penalty = this.getPenaltyScore();
      if (penalty < minPenalty) {
        minPenalty = penalty;
        bestMask = mask;
      }
      this.applyMask(mask);
    }
    this.applyMask(bestMask);
    return bestMask;
  }

  private applyMask(mask: number) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!this.isFunction[y][x]) {
          let invert = false;
          switch (mask) {
            case 0: invert = (x + y) % 2 === 0; break;
            case 1: invert = y % 2 === 0; break;
            case 2: invert = x % 3 === 0; break;
            case 3: invert = (x + y) % 3 === 0; break;
            case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
            case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
            case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
            case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          }
          if (invert) {
            this.modules[y][x] = !this.modules[y][x];
          }
        }
      }
    }
  }

  private drawFormatBits(mask: number) {
    const data = (this.errorCorrectionLevel.formatBits << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) {
      rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    }
    const bits = ((data << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i++) this.modules[i][8] = ((bits >>> i) & 1) !== 0;
    this.modules[7][8] = ((bits >>> 6) & 1) !== 0;
    this.modules[8][8] = ((bits >>> 7) & 1) !== 0;
    this.modules[8][7] = ((bits >>> 8) & 1) !== 0;
    for (let i = 9; i < 15; i++) this.modules[8][14 - i] = ((bits >>> i) & 1) !== 0;

    for (let i = 0; i < 8; i++) this.modules[8][this.size - 1 - i] = ((bits >>> i) & 1) !== 0;
    for (let i = 8; i < 15; i++) this.modules[this.size - 15 + i][8] = ((bits >>> i) & 1) !== 0;
  }

  private getPenaltyScore(): number {
    const size = this.size;
    let result = 0;

    for (let y = 0; y < size; y++) {
      let runColor = false;
      let runVal = 0;
      for (let x = 0; x < size; x++) {
        if (x === 0 || this.modules[y][x] !== runColor) {
          runColor = this.modules[y][x];
          runVal = 1;
        } else {
          runVal++;
          if (runVal === 5) result += 3;
          else if (runVal > 5) result += 1;
        }
      }
    }
    for (let x = 0; x < size; x++) {
      let runColor = false;
      let runVal = 0;
      for (let y = 0; y < size; y++) {
        if (y === 0 || this.modules[y][x] !== runColor) {
          runColor = this.modules[y][x];
          runVal = 1;
        } else {
          runVal++;
          if (runVal === 5) result += 3;
          else if (runVal > 5) result += 1;
        }
      }
    }
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const color = this.modules[y][x];
        if (color === this.modules[y][x + 1] && color === this.modules[y + 1][x] && color === this.modules[y + 1][x + 1]) {
          result += 3;
        }
      }
    }
    return result;
  }

  private static getNumRawDataModules(ver: number): number {
    let result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }

  private static getNumDataCodewords(ver: number, ecl: EccInfo): number {
    return (
      QrGenerator.getNumRawDataModules(ver) / 8 -
      ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] *
        NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver]
    );
  }

  private static getAlignmentPatternPositions(ver: number): number[] {
    if (ver === 1) return [];
    const num = Math.floor(ver / 7) + 2;
    const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (num * 2 - 2)) * 2;
    const result = [6];
    for (let pos = ver * 4 + 10; result.length < num; pos -= step) {
      result.splice(1, 0, pos);
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// QrCodeSvg Component
// ---------------------------------------------------------------------------

export const QrCodeSvg = ({
  value,
  size = 128,
  bgColor = "#ffffff",
  fgColor = "#000000",
  level = "M",
  includeMargin = true,
  className = "",
  style,
  ...rest
}: QrCodeSvgProps) => {
  const { pathData, viewBoxSize, margin } = useMemo(() => {
    if (!value) {
      return { pathData: "", viewBoxSize: 21, margin: 0 };
    }

    try {
      const qr = QrGenerator.encode(value, level);
      const m = includeMargin ? 2 : 0;
      const totalSize = qr.size + m * 2;

      let d = "";
      for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
          if (qr.modules[y][x]) {
            d += `M${x + m},${y + m}h1v1h-1z `;
          }
        }
      }

      return { pathData: d.trim(), viewBoxSize: totalSize, margin: m };
    } catch (err) {
      console.error("Failed to generate QR Code SVG:", err);
      return { pathData: "", viewBoxSize: 21, margin: 0 };
    }
  }, [value, level, includeMargin]);

  if (!pathData) {
    return null;
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      {...rest}
    >
      {bgColor && bgColor !== "transparent" && (
        <rect width={viewBoxSize} height={viewBoxSize} fill={bgColor} />
      )}
      <path d={pathData} fill={fgColor} />
    </svg>
  );
};
