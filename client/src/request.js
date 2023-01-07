function request(options) {
  const defaultOptions = {
    method: "GET",
    baseURL: "http://localhost:4000",
    Headers: {},
    data: {},
  };
  options = {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...options.headers },
  };
  return new Promise(function (resolve, reject) {
    const xhr = new XMLHttpRequest();
    options.setXHR && options.setXHR(xhr);
    xhr.open(options.method, options.baseURL + options.url);
    for (const key in options.headers) {
      xhr.setRequestHeader(key, options.headers[key]);
    }
    xhr.responseType = "json";
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        resolve(xhr.response);
      }
    };
    xhr.upload.onprogress = options.onprogress;
    xhr.send(options.data);
  });
}

export default request;
