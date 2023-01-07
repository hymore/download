import express from "express";
import { INTERNAL_SERVER_ERROR } from "http-status-codes";
import createError from "http-errors";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import multiparty from "multiparty";
import logger from "morgan";
import { mergeChunks, TEMP_DIR } from "./utils.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PUBLIC_DIR = path.resolve(__dirname, "public");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.resolve(__dirname, "public")));

app.post(
  "/upload/:filename/:chunk_name/:start",
  async function (req, res, next) {
    let { filename, chunk_name, start } = req.params;
    start = isNaN(start) ? 0 : Number(start);
    let fileDir = path.resolve(TEMP_DIR, filename);
    console.log("fileDir", fileDir);
    const exist = await fs.pathExists(fileDir);
    if (!exist) await fs.mkdirp(fileDir);
    const chunkFilePath = path.resolve(fileDir, chunk_name);
    const ws = fs.createWriteStream(chunkFilePath, { start, flags: "a" });
    req.on("end", () => {
      ws.close();
      res.json({ success: true });
    });
    req.on("error", () => {
      ws.close();
    });
    req.on("close", () => {
      ws.close();
    });
    req.pipe(ws);
  }
);
app.get("/merge/:filename", async (req, res, next) => {
  const { filename } = req.params;
  await mergeChunks(filename);
  res.json({ success: true });
});
app.get("/verify/:filename", async (req, res, next) => {
  const { filename } = req.params;
  // 添加秒传
  const filePath = path.resolve(PUBLIC_DIR, filename);
  const fileExist = await fs.pathExists(filePath);
  if (fileExist)
    return res.json({
      success: true,
      needUpload: false,
    });
  let fileDir = path.resolve(TEMP_DIR, filename);
  const exist = await fs.pathExists(fileDir);
  let uploadedList = [];
  if (exist) {
    uploadedList = await fs.readdir(fileDir);
    uploadedList = await Promise.all(
      uploadedList.map(async (filename) => {
        const stat = await fs.stat(path.resolve(fileDir, filename));
        return {
          filename,
          size: stat.size,
        };
      })
    );
  }
  res.json({
    success: true,
    needUpload: true,
    uploadedList,
  });
});

// app.post("/upload", function (req, res, next) {
//   const form = new multiparty.Form();
//   form.parse(req, async function (err, fields, files) {
//     if (err) return next(err);
//     console.log(fields, files);
//     const filename = fields.filename[0];
//     const chunk = files.chunk[0];
//     await fs.move(chunk.path, path.resolve(PUBLIC_DIR, filename), {
//       overwrite: true,
//     });
//     res.json({ success: true });
//   });
// });

app.use(function (req, res, next) {
  next(createError(404));
});
app.use(function (error, res, req, next) {
  res.status(error.status | INTERNAL_SERVER_ERROR);
  res.json({ success: false, error });
});

export default app;
