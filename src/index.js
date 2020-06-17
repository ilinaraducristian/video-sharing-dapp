const { app, BrowserWindow } = require("electron");
const path = require("path");
const { ipcMain } = require("electron");
const Web3 = require("web3");
const VideoProcessor = require("./video-processor");
const IPFS = require("./ipfs");
const fs = require("fs").promises;
const os = require("os");
const homedir = os.homedir();
const tmpdir = os.tmpdir();

let mainWindow;
let web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
let walletLoaded = false;
let keystore;

if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = async () => {
  const keystoreDir = `${homedir}/.ethereum/keystore`;
  keystore = await fs
    .readdir(keystoreDir, { encoding: "utf-8" })
    .then((files) =>
      fs.readFile(`${keystoreDir}/${files[0]}`, { encoding: "utf-8" })
    )
    .then((keystore) => {
      walletLoaded = true;
      return JSON.parse(keystore);
    });

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { nodeIntegration: true },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // mainWindow.webContents.openDevTools();

  ipcMain.on("upload", (event, filepath, name, description) => {
    fs.access(filepath)
      .then(() => {
        uploadVideo(filepath, name, description);
        event.reply("upload", "ok");
      })
      .catch((reason) => {
        event.reply("upload", reason);
      });
  });

  IPFS.resolve("QmcZ9sH1pPcwUHXNcRcMHf3zzdsfKLivnJcGsx5AToPE7L")
    .then(IPFS.get)
    .then((ipfspath) => fs.readFile(`${tmpdir}/${ipfspath}`))
    .then((file) => JSON.parse(file.toString("utf-8")))
    .then((videoFile) => {
      console.log(videoFile.qualities);
    });
};

async function uploadVideo(filepath, name, description) {
  const lastSlash = filepath.lastIndexOf("/");
  const lastDot = filepath.lastIndexOf(".");
  const dir = filepath.substring(0, lastSlash);
  const fileExtension = filepath.substring(lastDot + 1);
  const filename = filepath.substring(lastSlash + 1, lastDot);
  await VideoProcessor.toMultipleQualities(filepath, (progress) => {
    sendToRenderer("upload-progress", undefined, progress);
  });
  let videofile = {
    name,
    description,
    duration: 0,
    qualities: {},
  };
  let videoInfo = await VideoProcessor.getVideoInfo(filepath);
  // add quality to file
  videofile.duration = videoInfo.duration;
  let qualityIndex = VideoProcessor.qualities.indexOf(videoInfo.quality);

  let promises = [];
  for (let i = 0; i < qualityIndex; i++) {
    promises.push(
      IPFS.add(
        `${dir}/${filename}-${VideoProcessor.qualities[i]}.${fileExtension}`
      ).then((ipfspath) => {
        videofile.qualities[VideoProcessor.qualities[i]] = [ipfspath];
      })
    );
  }
  promises.push(
    IPFS.add(filepath).then((ipfspath) => {
      videofile.qualities[VideoProcessor.qualities[qualityIndex]] = [ipfspath];
    })
  );
  Promise.all(promises)
    .then(() =>
      fs.writeFile(`${tmpdir}/videoFile.json`, JSON.stringify(videofile), {
        encoding: "utf-8",
      })
    )
    .then(() => IPFS.add(`${tmpdir}/videoFile.json`).then(IPFS.publish))
    .then((ipns) => {
      console.log(ipns);
    })
    .then(() =>
      fs.rename(
        filepath,
        `${dir}/${filename}-${VideoProcessor.qualities[qualityIndex]}.${fileExtension}`
      )
    );
}

function sendToRenderer(channel, ...args) {
  mainWindow.webContents.send(channel, args);
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
