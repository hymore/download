import app from "./app.js";
import Http from "http";

const port = process.env.PORT || 4000;
const server = Http.createServer(app);

server.listen(port);
server.on("error", onError);
server.on("listening", onListening);

function onError(err) {
  console.log(err);
}
function onListening() {
  console.log("listening on " + port);
}
