import { Row, Col, Button, message, Progress, Table, Space } from "antd";
import { useState, useEffect, useMemo } from "react";
import request from "./request";
const MAX_SIZE = 1024 * 1024 * 20;
const DEFAULT_SIZE = 100 * 1024;
const VALID_TYPE_LIST = ["image/jpeg", "image/jpg", "image/png", "video/mp4"];
function Upload() {
  const [currentFile, setCurrentFile] = useState();
  const [previewUrl, setPreviewUrll] = useState();
  const [hashPercent, setHashPercent] = useState(0);
  const [filename, setFilename] = useState("");
  const [chunkList, setChunkList] = useState([]);

  const totalPercent = useMemo(() => {
    const sum = chunkList.reduce(
      (acc, cur) => acc + cur.percent / chunkList.length,
      0
    );
    return sum;
  }, [chunkList]);

  const handleChange = (e) => {
    console.log(e.target.files[0]);
    setCurrentFile(e.target.files[0]);
  };
  const handleUpload = async () => {
    if (!currentFile) {
      return message.error("请选择文件");
    }
    if (!isValid(currentFile)) return;
    const chunkList = createChunks(currentFile);
    const hash = await createHash(chunkList);
    const dotIndex = currentFile.name.lastIndexOf(".");
    const extname = currentFile.name.slice(dotIndex);
    const filename = `${hash}${extname}`;
    setFilename(filename);
    chunkList.forEach((chunk, index) => {
      chunk.filename = filename;
      chunk.chunk_name = filename + "-" + index;
      chunk.loaded = 0;
      chunk.percent = 0;
    });
    setChunkList(chunkList);
    uploadChunks(chunkList, filename);
    // if (isValid(currentFile)) {
    //   const formData = new FormData();
    //   formData.append("filename", currentFile.name);
    //   formData.append("chunk", currentFile);
    //   const result = await request({
    //     url: "/upload",
    //     method: "POST",
    //     data: formData,
    //   });
    //   console.log(result);
    //   message.success("上传成功");
    // }
  };
  async function handlePause() {
    chunkList.forEach((chunkData) => chunkData.xhr && chunkData.xhr.abort());
  }
  async function handleResume() {
    uploadChunks(chunkList, filename);
  }
  async function uploadChunks(chunkList, filename) {
    const { needUpload, uploadedList } = await verify(filename);
    if (!needUpload) return message.success("上传成功");
    let requests = await createRequests(chunkList, uploadedList);
    await Promise.all(requests);
    await request({
      url: `/merge/${filename}`,
    });
  }
  async function verify(filename) {
    return await request({
      url: `/verify/${filename}`,
    });
  }
  async function createRequests(chunkList, uploadedList) {
    return chunkList
      .filter((chunkData) => {
        const uploaded = uploadedList.find(
          (file) => file.filename === chunkData.chunk_name
        );
        if (!uploaded) {
          chunkData.loaded = 0;
          chunkData.percent = 0;
          return true;
        }
        if (uploaded.size < chunkData.size) {
          chunkData.loaded = uploaded.size; //已经上传的大小
          chunkData.percent = Number(
            //已经上传的百分比
            ((uploaded.size / chunkData.size) * 100).toFixed(2)
          );
          return true;
        }
        return false;
      })
      .map((data) =>
        request({
          method: "POST",
          url: `/upload/${data.filename}/${data.chunk_name}/${data.loaded}`,
          headers: { "Content-Type": "application/octet-stream" },
          data: data.chunk.slice(data.loaded),
          setXHR: (xhr) => (data.xhr = xhr),
          onprogress: (event) => {
            data.percent = Number(
              (((data.loaded + event.loaded) / data.size) * 100).toFixed(2)
            );
            setChunkList([...chunkList]);
          },
        })
      );
  }
  function createHash(chunkList) {
    return new Promise((resolve, reject) => {
      const worker = new Worker("/hash.js");
      worker.postMessage({ chunkList });
      worker.onmessage = (event) => {
        let { percent, hash } = event.data;
        setHashPercent(percent);
        if (hash) {
          resolve(hash);
        }
      };
    });
  }
  const createChunks = (file) => {
    let current = 0;
    let chunkList = [];
    while (current < file.size) {
      const chunk = file.slice(current, current + DEFAULT_SIZE);
      chunkList.push({ chunk, size: chunk.size });
      current += DEFAULT_SIZE;
    }
    return chunkList;
  };
  const isValid = (file) => {
    const { type, size } = file;
    const isValidType = VALID_TYPE_LIST.includes(type);
    if (!isValidType) {
      message.error("文件类型错误");
    }
    const isValidSize = size <= MAX_SIZE;
    if (!isValidSize) {
      message.error("文件大小错误");
    }
    return isValidType && isValidSize;
  };
  const columns = [
    {
      title: "切片名称",
      dataIndex: "chunk_name",
      width: "25%",
    },
    {
      title: "进度",
      dataIndex: "percent",
      width: "75%",
      render: (val) => <Progress percent={val} />,
    },
  ];

  useEffect(() => {
    if (!currentFile) return;
    const urlObject = window.URL.createObjectURL(currentFile);
    setPreviewUrll(urlObject);
    return () => {
      window.URL.revokeObjectURL(currentFile);
    };
  }, [currentFile]);
  return (
    <div>
      <Row>
        <Col span={12}>
          <input type="file" onChange={handleChange}></input>
          <Space size={20}>
            <Button
              style={{ margin: "10px 0" }}
              onClick={handleUpload}
              type="primary"
            >
              上传
            </Button>
            <Button
              style={{ margin: "10px 0" }}
              onClick={handlePause}
              type="primary"
            >
              暂停
            </Button>
            <Button
              style={{ margin: "10px 0" }}
              onClick={handleResume}
              type="primary"
            >
              继续
            </Button>
          </Space>
        </Col>
        <Col span={12}>
          {previewUrl && (
            <img style={{ width: 200 }} alt="预览" src={previewUrl} />
          )}
        </Col>
      </Row>
      <Row>
        <Col span={4}>生成hash进度</Col>
        <Col span={20}>
          <Progress percent={hashPercent} />
        </Col>
      </Row>
      <Row>
        <Col span={4}>文件上传总进度</Col>
        <Col span={20}>
          <Progress percent={totalPercent} />
        </Col>
      </Row>
      <Table rowKey="chunk_name" columns={columns} dataSource={chunkList} />
    </div>
  );
}

export default Upload;
