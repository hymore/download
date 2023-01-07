/* eslint-disable no-restricted-globals */
self.importScripts(
  "https://cdn.bootcdn.net/ajax/libs/spark-md5/3.0.2/spark-md5.min.js"
);

self.onmessage = async (event) => {
  let { chunkList } = event.data;
  const spark = new self.SparkMD5.ArrayBuffer();
  let percent = 0;
  let perChunk = 100 / chunkList.length;
  let buffers = await Promise.all(
    chunkList.map(({ chunk, size }) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(chunk);
        reader.onload = function (event) {
          percent += perChunk;
          self.postMessage({
            percent: Number(percent.toFixed(2)),
          });
          resolve(event.target.result);
        };
      });
    })
  );
  buffers.forEach((buffer) => spark.append(buffer));
  self.postMessage({ percent: 100, hash: spark.end() });
  self.close();
};
