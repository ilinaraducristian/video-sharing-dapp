const fs = require("fs").promises;
const exec = require("child_process").exec;

module.exports = class VideoProcessor {
  static qualities = [
    "144p",
    "240p",
    "360p",
    "480p",
    "720p",
    "1080p",
    "1440p",
    "2160p",
  ];

  static resolutions = [
    { width: 256, height: 144 },
    { width: 426, height: 240 },
    { width: 640, height: 360 },
    { width: 854, height: 480 },
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
    { width: 3840, height: 2160 },
  ];

  constructor() {}

  static getVideoInfo(filepath) {
    return new Promise((resolve, reject) => {
      exec(`ffprobe -i ${filepath}`, (err, stdout, stderr) => {
        if (err) return reject(err);
        let res = stderr.match(/\d+x\d+/gm)[0];
        let fps = parseFloat(stderr.match(/\d+\.?\d+ fps/gm)[0].split(" ")[0]);
        let resolution = {
          width: parseInt(res.substring(0, res.indexOf("x"))),
          height: parseInt(res.substring(res.indexOf("x") + 1, res.length)),
        };
        let duration = stderr.match(/Duration: \d\d:\d\d:\d\d.\d\d/gm)[0];
        let seconds = duration
          .split(" ")[1]
          .split(":")
          .map((val) => parseFloat(val));
        seconds = seconds[0] * 3600 + seconds[1] * 60 + seconds[2];
        resolve({
          resolution,
          fps,
          duration: seconds,
          quality: `${resolution.height}p`,
        });
      });
    });
  }

  static async toMultipleQualities(filepath, cb) {
    const lastSlash = filepath.lastIndexOf("/");
    const lastDot = filepath.lastIndexOf(".");
    const dir = filepath.substring(0, lastSlash);
    const fileExtension = filepath.substring(lastDot + 1);
    const filename = filepath.substring(lastSlash + 1, lastDot);
    let videoInfo = await this.getVideoInfo(filepath);
    // add quality to file
    let qualityIndex = this.qualities.indexOf(videoInfo.quality);
    if (qualityIndex == 0) {
      return fs.rename(
        filepath,
        `${dir}/${filename}-${this.qualities[qualityIndex]}.${fileExtension}`
      );
    }
    let promises = [];
    let progress = 0;
    if (cb) {
      cb(progress);
    }
    for (let i = 0; i < qualityIndex; i++) {
      promises.push(
        new Promise((resolve) =>
          exec(
            `ffmpeg -i ${filepath} -vf scale=${VideoProcessor.resolutions[i].width}:${VideoProcessor.resolutions[i].height} ${dir}/${filename}-${this.qualities[i]}.${fileExtension}`,
            (err, stdout, stderr) => {
              if (cb) {
                if (i == qualityIndex - 1) {
                  progress = 1;
                } else {
                  progress += 1 / qualityIndex;
                }
                cb(progress);
              }
              resolve();
            }
          )
        )
      );
    }
    return Promise.all(promises);
  }
};
