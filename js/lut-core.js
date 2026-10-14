/* Pure LUT engine. Shared by the UI, worker and Node tests. */
(function (root) {
  'use strict';
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  function parseCube(text, filename = 'Untitled.cube') {
    if (typeof text !== 'string' || text.length > 70 * 1024 * 1024) throw new Error('LUT 文本过大（上限 70 MB）');
    let size1D = 0, size3D = 0, title = filename.replace(/\.cube$/i, ''), base = 'UNKNOWN';
    let domainMin = [0, 0, 0], domainMax = [1, 1, 1], range1D, range3D;
    const rows = [], warnings = [], seen = new Set();
    const number = (v, line) => {
      const n = Number(v);
      if (!v || !Number.isFinite(n)) throw new Error(`第 ${line} 行包含无效数字`);
      return n;
    };
    const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      const photoStyle = line.match(/^#\s*LUMIXPHOTOSTYLE\s+(\S+)/i);
      if (photoStyle) base = photoStyle[1].toUpperCase();
      if (!line || line.startsWith('#') || line.startsWith('//')) continue;
      if (/^TITLE\b/i.test(line)) {
        if (rows.length) throw new Error(`第 ${i + 1} 行：标头必须位于数据前`);
        title = line.replace(/^TITLE\s*/i, '').replace(/^"(.*)"\s*(?:#.*)?$/, '$1');
        continue;
      }
      line = line.split('#')[0].trim();
      const parts = line.replace(/,/g, ' ').split(/\s+/), key = parts[0].toUpperCase();
      if (/^[A-Z_]/.test(key)) {
        if (rows.length) throw new Error(`第 ${i + 1} 行：数据中出现标头 ${key}`);
        if (seen.has(key)) throw new Error(`重复标头：${key}`);
        seen.add(key);
        const values = parts.slice(1).map(v => number(v, i + 1));
        if (key === 'LUT_1D_SIZE' || key === 'LUT_3D_SIZE') {
          const max = key === 'LUT_1D_SIZE' ? 65536 : 129;
          if (values.length !== 1 || !Number.isInteger(values[0]) || values[0] < 2 || values[0] > max) throw new Error(`${key} 需为 2–${max} 的整数`);
          if (key === 'LUT_1D_SIZE') size1D = values[0]; else size3D = values[0];
        } else if (key === 'DOMAIN_MIN' || key === 'DOMAIN_MAX') {
          if (values.length !== 3) throw new Error(`${key} 需要 3 个数字`);
          if (key === 'DOMAIN_MIN') domainMin = values; else domainMax = values;
        } else if (key === 'LUT_1D_INPUT_RANGE' || key === 'LUT_3D_INPUT_RANGE') {
          if (values.length !== 2 || values[1] <= values[0]) throw new Error(`${key} 范围无效`);
          if (key === 'LUT_1D_INPUT_RANGE') range1D = values; else range3D = values;
        } else {
          throw new Error(`暂不支持标头 ${key}，请导出标准 CUBE`);
        }
      } else {
        if (!size1D && !size3D) throw new Error('缺少 LUT_1D_SIZE / LUT_3D_SIZE 标头');
        if (parts.length !== 3) throw new Error(`第 ${i + 1} 行需要 RGB 三个值`);
        rows.push(parts.map(v => number(v, i + 1)));
        if (rows.length > size1D + size3D ** 3) throw new Error('数据行多于标头声明，文件可能拼接或损坏');
      }
    }
    if (!size1D && !size3D) throw new Error('找不到 LUT 尺寸');
    if (domainMin.some((v, i) => domainMax[i] <= v)) throw new Error('DOMAIN_MAX 必须大于 DOMAIN_MIN');
    const expected = size1D + size3D ** 3;
    if (rows.length !== expected) throw new Error(`数据不完整：需要 ${expected} 行，实际 ${rows.length} 行`);
    const oneD = size1D ? new Float32Array(rows.slice(0, size1D).flat()) : null;
    const threeD = size3D ? new Float32Array(rows.slice(size1D).flat()) : null;
    let min = Infinity, max = -Infinity;
    for (const row of rows) for (const v of row) { min = Math.min(min, v); max = Math.max(max, v); }
    if (min < 0 || max > 1) warnings.push('保留了超出 0–1 的输出值；显示时才裁切到 sRGB');
    return { title, base, size1D, size3D, oneD, threeD, domainMin, domainMax, range1D, range3D, min, max, warnings };
  }
  function sample1D(lut, rgb) {
    return rgb.map((v, c) => {
      const lo = lut.range1D ? lut.range1D[0] : lut.domainMin[c];
      const hi = lut.range1D ? lut.range1D[1] : lut.domainMax[c];
      const p = clamp((v - lo) / (hi - lo)) * (lut.size1D - 1), a = Math.floor(p), b = Math.min(a + 1, lut.size1D - 1);
      return lut.oneD[a * 3 + c] * (1 - p + a) + lut.oneD[b * 3 + c] * (p - a);
    });
  }
  function sample3D(lut, rgb, interpolation) {
    const n = lut.size3D, d = lut.threeD;
    const p = rgb.map((v, c) => clamp((v - (lut.range3D ? lut.range3D[0] : lut.domainMin[c])) / ((lut.range3D ? lut.range3D[1] : lut.domainMax[c]) - (lut.range3D ? lut.range3D[0] : lut.domainMin[c]))) * (n - 1));
    const a = p.map(v => Math.min(Math.floor(v), n - 2)), f = p.map((v, i) => v - a[i]);
    const at = (x, y, z, c) => d[((a[2] + z) * n * n + (a[1] + y) * n + a[0] + x) * 3 + c];
    const result = [0, 0, 0];
    if (interpolation === 'trilinear') {
      for (let c = 0; c < 3; c++) {
        for (let z = 0; z < 2; z++) for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++)
          result[c] += at(x, y, z, c) * (x ? f[0] : 1 - f[0]) * (y ? f[1] : 1 - f[1]) * (z ? f[2] : 1 - f[2]);
      }
    } else {
      // Six tetrahedra, with RGB values stored red-fastest in CUBE files.
      const order = [0, 1, 2].sort((x, y) => f[y] - f[x]);
      const v1 = [0, 0, 0], v2 = [0, 0, 0]; v1[order[0]] = 1; v2[order[0]] = v2[order[1]] = 1;
      for (let c = 0; c < 3; c++) {
        const c0 = at(0, 0, 0, c), c1 = at(...v1, c), c2 = at(...v2, c), c3 = at(1, 1, 1, c);
        result[c] = c0 + f[order[0]] * (c1 - c0) + f[order[1]] * (c2 - c1) + f[order[2]] * (c3 - c2);
      }
    }
    return result;
  }
  function sample(lut, rgb, interpolation = 'tetrahedral') {
    if (!lut) return rgb;
    if (lut.size1D) rgb = sample1D(lut, rgb);
    return lut.size3D ? sample3D(lut, rgb, interpolation) : rgb;
  }
  const linearize = x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  const encodeSRGB = x => x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  const encodeVLog = x => x < 0.01 ? 5.6 * x + 0.125 : 0.241514 * Math.log10(x + 0.00873) + 0.598206;
  const encodeFLog2 = x => x < 0.000889 ? 8.799461 * x + 0.092864 : 0.245281 * Math.log10(5.555556 * x + 0.064829) + 0.384316;
  const multiply = (m, rgb) => m.map(row => row.reduce((sum, v, c) => sum + v * rgb[c], 0));
  function inverse(m) {
    const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    return [[e * i - f * h, c * h - b * i, b * f - c * e], [f * g - d * i, a * i - c * g, c * d - a * f], [d * h - e * g, b * g - a * h, a * e - b * d]].map(row => row.map(v => v / det));
  }
  const toV = inverse([[1.806576, -0.695697, -0.110879], [-0.17009, 1.305955, -0.135865], [-0.025206, -0.154468, 1.179674]]);
  const toF = [[0.627404, 0.329283, 0.043313], [0.069097, 0.91954, 0.011363], [0.016391, 0.088013, 0.895596]];
  function prepare(rgb, options) {
    if (!options.exposure && (!options.adapt || options.adapt === 'direct')) return rgb;
    const linear = rgb.map(v => linearize(v) * 2 ** (options.exposure || 0));
    if (options.adapt === 'vlog') return multiply(toV, linear).map(v => encodeVLog(Math.max(0, v)));
    if (options.adapt === 'flog2') return multiply(toF, linear).map(v => encodeFLog2(Math.max(0, v)));
    return linear.map(encodeSRGB);
  }
  function transform(rgb, lut, options = {}, preLut = null) {
    const interpolation = options.interpolation || 'tetrahedral';
    const prepared = prepare(rgb, options);
    const result = sample(lut, sample(preLut, prepared, interpolation), interpolation);
    const strength = clamp(options.strength == null ? 1 : options.strength);
    // The neutral side of the strength blend is the displayed original, not Log encoded RGB.
    return result.map((v, c) => rgb[c] + (v - rgb[c]) * strength);
  }
  function renderPixels(pixels, lut, options = {}, preLut = null) {
    const output = new Uint8ClampedArray(pixels.length);
    for (let i = 0; i < pixels.length; i += 4) {
      const rgb = transform([pixels[i] / 255, pixels[i + 1] / 255, pixels[i + 2] / 255], lut, options, preLut);
      output[i] = clamp(rgb[0]) * 255; output[i + 1] = clamp(rgb[1]) * 255; output[i + 2] = clamp(rgb[2]) * 255; output[i + 3] = pixels[i + 3];
    }
    return output;
  }
  const api = { clamp, parseCube, sample, transform, renderPixels, linearize, encodeSRGB, encodeVLog, encodeFLog2 };
  root.LUTCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : self);
