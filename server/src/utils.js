import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import { PUBLIC_DIR } from "./app.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultSize = 100 * 1024;
export const TEMP_DIR = path.resolve(__dirname, "temp");

// async function splitChunks(filename, size = defaultSize) {
//   const filePath = path.resolve(__dirname, filename);
//   const chunkDir = path.resolve(TEMP_DIR, filename);
//   await fs.mkdirp(chunkDir);
//   const content = await fs.readFile(filePath);
//   const fileSize = content.length;
//   let i = 0,
//     current = 0;
//   while (current < fileSize) {
//     await fs.writeFile(
//       path.resolve(chunkDir, filename + "-" + i),
//       content.slice(current, current + size)
//     );
//     i++;
//     current += size;
//   }
// }
/**
   读取目录下所有文件
   把文件合并在一起
   删除temp文件
   为了提高性能，需要用流实现
 */
export async function mergeChunks(filename, size = defaultSize) {
  const filePath = path.resolve(PUBLIC_DIR, filename);
  const chunksDir = path.resolve(TEMP_DIR, filename);
  const chunkFIles = await fs.readdir(chunksDir);
  chunkFIles.sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]));
  await Promise.all(
    chunkFIles.map((chunkPath, index) =>
      pipeStream(
        path.resolve(chunksDir, chunkPath),
        fs.createWriteStream(filePath, { start: index * size })
      )
    )
  );
  await fs.rmdir(chunksDir);
}

function pipeStream(filePath, ws) {
  return new Promise(function (resolve, reject) {
    const rs = fs.createReadStream(filePath);
    rs.on("end", async function () {
      rs.close();
      await fs.unlink(filePath);
      resolve();
    });
    rs.pipe(ws);
  });
}
