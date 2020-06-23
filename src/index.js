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
const Database = require("./database");

if (require("electron-squirrel-startup")) {
  app.quit();
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

let mainWindow;
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
const contractAddress = `0x32600864Dc2f94d8e62BBE7d63618120831CEaFd`;

let keystore;
let node;
let database;
let isIPFSInitialized = false;

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { nodeIntegration: true },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // mainWindow.webContents.openDevTools();

  ipcMainEvents();

  loadContracts();

  IPFS.init().then(() => {
    this.ipfsInitialized = true;
  });
};

async function loadContracts() {
  const contractsFile = await fs.readFile(
    `${__dirname}/contracts/contracts.json`,
    {
      encoding: "utf-8",
    }
  );
  const contracts = JSON.parse(contractsFile).contracts;
  Database.init(contracts, web3);
  database = new Database(contractAddress);
}

function ipcMainEvents() {
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

  ipcMain.on("search", async (event, userIPFSAddress) => {
    const videos = [];
    const user = await database.getUser(userIPFSAddress);
    const videosIPFSPath = (await IPFS.cat(user.videosIPFSAddress))
      .toString("utf-8")
      .match(/.+/g);
    for (const videoIPFSPath of videosIPFSPath) {
      const files = await IPFS.ls(videoIPFSPath);
      let metadata = files.find((file) => file.name === "metadata.json");
      if (metadata == null) return;
      try {
        metadata = JSON.parse((await IPFS.cat(metadata.path)).toString("utf8"));
      } catch {
        return;
      }
      const thumbnail = await IPFS.cat(
        `${videoIPFSPath}/${metadata.thumbnail}`
      );
      metadata.thumbnail = {
        filename: metadata.thumbnail,
        base64: thumbnail.toString("base64"),
      };
      videos.push(metadata);
    }
    event.reply("search", videos);
    // const videos = await IPFS.ls(videosIPFSPath)
  });
}

async function loadKeystore() {
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
}

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
        videofile.qualities[VideoProcessor.qualities[i]] = ipfspath;
      })
    );
  }
  promises.push(
    IPFS.add(filepath).then((ipfspath) => {
      videofile.qualities[VideoProcessor.qualities[qualityIndex]] = ipfspath;
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
