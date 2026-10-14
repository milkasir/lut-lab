'use strict';
importScripts('lut-core.js');
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'parse') {
      const lut = LUTCore.parseCube(data.text, data.filename);
      self.postMessage({ id: data.id, result: lut });
    } else if (data.type === 'render') {
      const output = LUTCore.renderPixels(data.pixels, data.lut, data.options, data.preLut);
      self.postMessage({ id: data.id, result: output }, [output.buffer]);
    }
  } catch (error) { self.postMessage({ id: data.id, error: error.message }); }
};
