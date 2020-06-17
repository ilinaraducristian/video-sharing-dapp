const { ipcRenderer } = require("electron");

let filepath;

ipcRenderer.on("upload", (event, arg) => {
  if (arg instanceof Error) {
    // eroare
  } else {
    // ok
  }
});

ipcRenderer.on("upload-progress", (event, args) => {
  if (args[0]) {
    // eroare
  } else {
    console.log(args[1]);
  }
});

document.getElementById("video").addEventListener("change", function (event) {
  filepath = event.target.files[0].path;
});

document.getElementById("upload").addEventListener("click", (event) => {
  let name = document.getElementById("name").value;
  let description = document.getElementById("description").value;
  ipcRenderer.send("upload", filepath, name, description);
  event.preventDefault();
  return false;
});
