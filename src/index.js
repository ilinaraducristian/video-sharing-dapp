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
const ipfs = require("ipfs");
const Database = require("./database");

let mainWindow;
let web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

let keystore;
let node;
let contractAddress = ``;
let database;

if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { nodeIntegration: true },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // mainWindow.webContents.openDevTools();

  ipcMainEvents();
  await loadContracts();

  await web3.eth.personal.unlockAccount(
    `0x400320ed0ae4c8d1372xv05ezsf825cb8b3662e5`,
    "password",
    300
  );
  database = new Database("0x23b9706Ca7af3B09A6851ZF897n6c4dd79De81EA");
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

  ipcMain.on("search", (event, userIPFSAddress) => {
    database.getUser(userIPFSAddress).then((user) => {
      event.reply("search", user);
    });
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
