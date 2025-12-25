
// // /************************************************
// //  * CLEAN SERVER
// //  * Graph + Multi Camera (1-Minute Continuous Recording)
// //  ************************************************/

// // const express = require("express");
// // const { MongoClient } = require("mongodb");
// // const cors = require("cors");
// // const bodyParser = require("body-parser");
// // const path = require("path");
// // const fs = require("fs");

// // const ffmpeg = require("fluent-ffmpeg");
// // const ffmpegPath = require("ffmpeg-static");
// // ffmpeg.setFfmpegPath(ffmpegPath);

// // const app = express();
// // const PORT = 4010;

// // /* ================= BASIC ================= */
// // app.use(cors());
// // app.use(bodyParser.json());
// // app.use(express.static(path.join(__dirname, "public")));

// // /* ================= MONGO ================= */
// // const uri = "mongodb://localhost:27017/mld";
// // const client = new MongoClient(uri);
// // let db;

// // async function connectToMongoDB() {
// //   await client.connect();
// //   db = client.db("mld");
// //   console.log("✅ MongoDB Connected");
// // }
// // function getCollection(name) {
// //   return db.collection(name);
// // }

// // /* ======================================================
// //    CAMERA CONFIG (RECORDING ONLY)
// //    ====================================================== */
// // const CAMERAS = {
// //   cam1: { rtsp: "rtsp://admin:Password%401@192.168.250.210:554/stream1" },
// //   cam2: { rtsp: "rtsp://admin:Password%401@192.168.250.215:554/stream1" },
// //   cam3: { rtsp: "rtsp://admin:Password%401@192.168.250.216:554/stream1" },
// //   cam4: { rtsp: "rtsp://admin:Password%401@192.168.250.217:554/stream1" }
// // };

// // /* ===== CREATE STORAGE FOLDERS ===== */
// // Object.keys(CAMERAS).forEach(id => {
// //   CAMERAS[id].videoDir = path.join(__dirname, "videos", id);
// //   if (!fs.existsSync(CAMERAS[id].videoDir)) {
// //     fs.mkdirSync(CAMERAS[id].videoDir, { recursive: true });
// //   }
// // });

// // /* ======================================================
// //    CAMERA RECORDING + HEALTH TRACKING
// //    ====================================================== */
// // const recordingProcesses = {};
// // const cameraStatus = {};

// // // init status
// // Object.keys(CAMERAS).forEach(id => {
// //   cameraStatus[id] = {
// //     running: false,
// //     lastSeen: null,
// //     lastError: null
// //   };
// // });

// // function startOneMinuteRecording(cameraId) {
// //   if (recordingProcesses[cameraId]) return;

// //   const cam = CAMERAS[cameraId];
// //   if (!cam) return;

// //   const outputPattern = path.join(
// //     cam.videoDir,
// //     `${cameraId}_%Y-%m-%d_%H-%M.mp4`
// //   );

// //   console.log(`🎥 Starting recording: ${cameraId}`);

// //   const proc = ffmpeg(cam.rtsp)
// //     .inputOptions([
// //       "-rtsp_transport tcp"
// //     ])
// //     .outputOptions([
// //       "-c:v libx264",
// //       "-preset ultrafast",
// //       "-f segment",
// //       "-segment_time 60",
// //       "-reset_timestamps 1",
// //       "-strftime 1"
// //     ])
// //     .output(outputPattern)
// //     .on("start", () => {
// //       cameraStatus[cameraId].running = true;
// //       cameraStatus[cameraId].lastError = null;
// //       console.log(`🟢 ${cameraId} recording running`);
// //     })
// //     .on("progress", () => {
// //       cameraStatus[cameraId].lastSeen = Date.now();
// //     })
// //     .on("error", err => {
// //       console.error(`🔴 ${cameraId} error: ${err.message}`);
// //       cameraStatus[cameraId].running = false;
// //       cameraStatus[cameraId].lastError = err.message;
// //       recordingProcesses[cameraId] = null;

// //       // Auto restart
// //       setTimeout(() => {
// //         console.log(`🔁 Restarting ${cameraId}...`);
// //         startOneMinuteRecording(cameraId);
// //       }, 5000);
// //     })
// //     .on("end", () => {
// //       console.warn(`⚠️ ${cameraId} stopped unexpectedly`);
// //       cameraStatus[cameraId].running = false;
// //       recordingProcesses[cameraId] = null;
// //     })
// //     .run();

// //   recordingProcesses[cameraId] = proc;
// // }

// // /* ======================================================
// //    CAMERA HEALTH LOG (EVERY 60 SEC)
// //    ====================================================== */
// // setInterval(() => {
// //   console.log("📊 CAMERA HEALTH STATUS");
// //   Object.keys(cameraStatus).forEach(id => {
// //     const s = cameraStatus[id];
// //     if (s.running) {
// //       const diff = s.lastSeen
// //         ? Math.round((Date.now() - s.lastSeen) / 1000)
// //         : "N/A";
// //       console.log(`🟢 ${id} RUNNING (last data ${diff}s ago)`);
// //     } else {
// //       console.log(`🔴 ${id} DOWN (${s.lastError || "no data"})`);
// //     }
// //   });
// //   console.log("------------------------------------------------");
// // }, 60000);

// // /* ======================================================
// //    VIDEO PLAY API (GRAPH CLICK)
// //    ====================================================== */
// // app.get("/api/camera/video", (req, res) => {
// //   const { cameraId, ts } = req.query;
// //   if (!cameraId || !ts) {
// //     return res.status(400).send("cameraId & ts required");
// //   }

// //   const cam = CAMERAS[cameraId];
// //   if (!cam) return res.status(404).send("Invalid camera");

// //   const t = new Date(ts);
// //   const fileName = `${cameraId}_${t.getFullYear()}-${
// //     String(t.getMonth() + 1).padStart(2, "0")
// //   }-${String(t.getDate()).padStart(2, "0")}_${
// //     String(t.getHours()).padStart(2, "0")
// //   }-${String(t.getMinutes()).padStart(2, "0")}.mp4`;

// //   const videoPath = path.join(cam.videoDir, fileName);
// //   if (!fs.existsSync(videoPath)) {
// //     return res.status(404).send("Video not ready");
// //   }

// //   res.sendFile(videoPath);
// // });

// // /* ======================================================
// //    GRAPH DATA API (UNCHANGED)
// //    ====================================================== */
// // app.get("/graphdatax", async (req, res) => {
// //   try {
// //     const { machine, from, to, date } = req.query;
// //     const now = new Date();

// //     function getCurrentShiftStart(now) {
// //       const h = now.getHours();
// //       const d = new Date(now);
// //       if (h >= 6 && h < 14) d.setHours(6,0,0,0);
// //       else if (h >= 14 && h < 22) d.setHours(14,0,0,0);
// //       else {
// //         if (h < 6) d.setDate(d.getDate() - 1);
// //         d.setHours(22,0,0,0);
// //       }
// //       return d;
// //     }

// //     let startTime, endTime;

// //     if (date) {
// //       startTime = new Date(date); startTime.setHours(0,0,0,0);
// //       endTime = new Date(date); endTime.setHours(23,59,59,999);
// //     } else if (from && to) {
// //       startTime = new Date(from); startTime.setHours(0,0,0,0);
// //       endTime = new Date(to); endTime.setHours(23,59,59,999);
// //     } else {
// //       const cur = getCurrentShiftStart(now);
// //       startTime = new Date(cur.getTime() - 16*3600000);
// //       endTime = new Date(cur.getTime() + 8*3600000);
// //     }

// //     const baseQuery = {
// //       timestamp: { $gte: startTime, $lt: endTime },
// //       second: { $exists: true },
// //       second2: { $exists: true }
// //     };
// //     if (machine) baseQuery.machineName = machine;

// //     const collection = getCollection("pm");

// //     if (machine) {
// //       const data = await collection.find(baseQuery).sort({ timestamp:1 }).toArray();
// //       return res.json({
// //         machines:[machine],
// //         dataByMachine:{ [machine]: data }
// //       });
// //     }

// //     const machines = await collection.distinct("machineName");
// //     const all = await collection.find(baseQuery).sort({ timestamp:1 }).toArray();

// //     const dataByMachine = {};
// //     machines.forEach(m => dataByMachine[m]=[]);
// //     all.forEach(r => r.machineName && dataByMachine[r.machineName].push(r));

// //     res.json({ machines, dataByMachine });

// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).send("graphdatax error");
// //   }
// // });

// // /* ================= SERVER START ================= */
// // app.listen(PORT, async () => {
// //   await connectToMongoDB();
// //   console.log(`🚀 Server running on http://localhost:${PORT}`);

// //   for (const camId of Object.keys(CAMERAS)) {
// //     startOneMinuteRecording(camId);
// //     await new Promise(r => setTimeout(r, 3000)); // stagger start
// //   }
// // });
// /************************************************
//  * FINAL ROBUST SERVER
//  * Graph + Multi Camera (1-Minute Continuous Recording)
//  ************************************************/

// const express = require("express");
// const { MongoClient } = require("mongodb");
// const cors = require("cors");
// const bodyParser = require("body-parser");
// const path = require("path");
// const fs = require("fs");

// const ffmpeg = require("fluent-ffmpeg");
// const ffmpegPath = require("ffmpeg-static");
// ffmpeg.setFfmpegPath(ffmpegPath);

// const app = express();
// const PORT = 4010;

// /* ================= BASIC ================= */
// app.use(cors());
// app.use(bodyParser.json());
// app.use(express.static(path.join(__dirname, "public")));
// /*=====================================Log File==========================*/
// const LOG_DIR = path.join(__dirname, "logs");
// if (!fs.existsSync(LOG_DIR)) {
//   fs.mkdirSync(LOG_DIR, { recursive: true });
// }


// /* ================= MONGO ================= */
// const uri = "mongodb://localhost:27017/mld";
// const client = new MongoClient(uri);
// let db;

// async function connectToMongoDB() {
//   await client.connect();
//   db = client.db("mld");
//   console.log("✅ MongoDB Connected");
// }
// function getCollection(name) {
//   return db.collection(name);
// }

// /* ======================================================
//    CAMERA CONFIG
//    ====================================================== */
// const CAMERAS = {
//   cam1: { rtsp: "rtsp://admin:Password%401@192.168.250.210:554/stream1" },
//   cam2: { rtsp: "rtsp://admin:Password%401@192.168.250.215:554/stream1" },
//   cam3: { rtsp: "rtsp://admin:Password%401@192.168.250.216:554/stream1" },
//   cam4: { rtsp: "rtsp://admin:Password%401@192.168.250.217:554/stream1" }
// };

// /* ===== CREATE STORAGE ===== */
// Object.keys(CAMERAS).forEach(id => {
//   CAMERAS[id].videoDir = path.join(__dirname, "videos", id);
//   if (!fs.existsSync(CAMERAS[id].videoDir)) {
//     fs.mkdirSync(CAMERAS[id].videoDir, { recursive: true });
//   }
// });

// /* ======================================================
//    RECORDING + HEALTH
//    ====================================================== */
// const recordingProcesses = {};
// const cameraStatus = {};

// Object.keys(CAMERAS).forEach(id => {
//   cameraStatus[id] = {
//     running: false,
//     lastSeen: null,
//     lastError: null
//   };
// });

// function startOneMinuteRecording(cameraId) {
//   if (recordingProcesses[cameraId]) return;

//   const cam = CAMERAS[cameraId];
//   if (!cam) return;

//   const outputPattern = path.join(
//     cam.videoDir,
//     `${cameraId}_%Y-%m-%d_%H-%M.mp4`
//   );

//   console.log(`🎥 Starting recording: ${cameraId}`);

//   const proc = ffmpeg(cam.rtsp)
//     .inputOptions([
//       "-rtsp_transport tcp",
//       "-fflags nobuffer",
//       "-flags low_delay"
//     ])
//     .outputOptions([
//       "-c:v libx264",
//       "-preset ultrafast",
//       "-f segment",
//       "-segment_time 60",
//       "-reset_timestamps 1",
//       "-strftime 1"
//     ])
//     .output(outputPattern)
//     .on("start", () => {
//       cameraStatus[cameraId].running = true;
//       cameraStatus[cameraId].lastError = null;
//       console.log(`🟢 ${cameraId} RECORDING`);
//     })
//     .on("progress", () => {
//       cameraStatus[cameraId].lastSeen = Date.now();
//     })
//     .on("error", err => {
//       console.error(`🔴 ${cameraId} ERROR: ${err.message}`);
//       cameraStatus[cameraId].running = false;
//       cameraStatus[cameraId].lastError = err.message;
//       recordingProcesses[cameraId] = null;

//       // 🔁 Retry safely
//       setTimeout(() => {
//         console.log(`🔁 Retrying ${cameraId}...`);
//         startOneMinuteRecording(cameraId);
//       }, 5000);
//     })
//     .on("end", () => {
//       console.warn(`⚠️ ${cameraId} stream ended`);
//       cameraStatus[cameraId].running = false;
//       recordingProcesses[cameraId] = null;

//       setTimeout(() => {
//         console.log(`🔁 Restart after end: ${cameraId}`);
//         startOneMinuteRecording(cameraId);
//       }, 5000);
//     })
//     .run();

//   recordingProcesses[cameraId] = proc;
// }


// /* ======================================================
//    HEALTH LOG (EVERY 60s)
//    ====================================================== */
// setInterval(() => {
//   console.log("📊 CAMERA HEALTH STATUS");
//   Object.keys(cameraStatus).forEach(id => {
//     const s = cameraStatus[id];
//     if (s.running) {
//       const diff = s.lastSeen
//         ? Math.round((Date.now() - s.lastSeen) / 1000)
//         : "N/A";
//       console.log(`🟢 ${id} RUNNING (last data ${diff}s ago)`);
//     } else {
//       console.log(`🔴 ${id} DOWN (${s.lastError || "no data"})`);
//     }
//   });
//   console.log("------------------------------------------------");
// }, 60000);

// /* ======================================================
//    VIDEO PLAY API
//    ====================================================== */
// app.get("/api/camera/video", (req, res) => {
//   const { cameraId, ts } = req.query;
//   if (!cameraId || !ts) return res.status(400).send("cameraId & ts required");

//   const cam = CAMERAS[cameraId];
//   if (!cam) return res.status(404).send("Invalid camera");

//   const t = new Date(ts);
//   const fileName = `${cameraId}_${t.getFullYear()}-${
//     String(t.getMonth()+1).padStart(2,"0")
//   }-${String(t.getDate()).padStart(2,"0")}_${
//     String(t.getHours()).padStart(2,"0")
//   }-${String(t.getMinutes()).padStart(2,"0")}.mp4`;

//   const videoPath = path.join(cam.videoDir, fileName);
//   if (!fs.existsSync(videoPath)) return res.status(404).send("Video not ready");

//   res.sendFile(videoPath);
// });

// /* ======================================================
//    GRAPH DATA API (AS IS)
//    ====================================================== */
// app.get("/graphdatax", async (req, res) => {
//   try {
//     const { machine, from, to, date } = req.query;
//     const now = new Date();

//     function getCurrentShiftStart(now) {
//       const h = now.getHours();
//       const d = new Date(now);
//       if (h >= 6 && h < 14) d.setHours(6,0,0,0);
//       else if (h >= 14 && h < 22) d.setHours(14,0,0,0);
//       else {
//         if (h < 6) d.setDate(d.getDate() - 1);
//         d.setHours(22,0,0,0);
//       }
//       return d;
//     }

//     let startTime, endTime;
//     if (date) {
//       startTime = new Date(date); startTime.setHours(0,0,0,0);
//       endTime = new Date(date); endTime.setHours(23,59,59,999);
//     } else if (from && to) {
//       startTime = new Date(from); startTime.setHours(0,0,0,0);
//       endTime = new Date(to); endTime.setHours(23,59,59,999);
//     } else {
//       const cur = getCurrentShiftStart(now);
//       startTime = new Date(cur.getTime() - 16*3600000);
//       endTime = new Date(cur.getTime() + 8*3600000);
//     }

//     const baseQuery = {
//       timestamp: { $gte: startTime, $lt: endTime },
//       second: { $exists: true },
//       second2: { $exists: true }
//     };
//     if (machine) baseQuery.machineName = machine;

//     const col = getCollection("pm");

//     if (machine) {
//       const data = await col.find(baseQuery).sort({timestamp:1}).toArray();
//       return res.json({ machines:[machine], dataByMachine:{[machine]:data} });
//     }

//     const machines = await col.distinct("machineName");
//     const all = await col.find(baseQuery).sort({timestamp:1}).toArray();

//     const dataByMachine = {};
//     machines.forEach(m => dataByMachine[m]=[]);
//     all.forEach(r => r.machineName && dataByMachine[r.machineName].push(r));

//     res.json({ machines, dataByMachine });

//   } catch (e) {
//     console.error(e);
//     res.status(500).send("graphdatax error");
//   }
// });
// /* ================= Log File ================= */
// function generateHealthLogText() {
//   let text = "";
//   text += "CAMERA HEALTH REPORT\n";
//   text += "====================\n";
//   text += `Generated: ${new Date().toLocaleString()}\n\n`;

//   Object.keys(cameraStatus).forEach(id => {
//     const s = cameraStatus[id];
//     if (s.running) {
//       text += `🟢 ${id} RUNNING\n`;
//     } else {
//       text += `🔴 ${id} DOWN - ${s.lastError || "No data"}\n`;
//     }
//   });

//   return text;
// }

// function cleanupOldLogs(days = 30) {
//   const now = Date.now();
//   const maxAge = days * 24 * 60 * 60 * 1000;

//   fs.readdir(LOG_DIR, (err, files) => {
//     if (err) return;

//     files.forEach(file => {
//       const filePath = path.join(LOG_DIR, file);
//       fs.stat(filePath, (err, stat) => {
//         if (!err && now - stat.mtimeMs > maxAge) {
//           fs.unlink(filePath, () => {});
//         }
//       });
//     });
//   });
// }

// /* ================= START ================= */
// app.listen(PORT, async () => {
//   await connectToMongoDB();
//   console.log(`🚀 Server running on http://localhost:${PORT}`);

//   for (const camId of Object.keys(CAMERAS)) {
//     startOneMinuteRecording(camId);
//     await new Promise(r => setTimeout(r, 4000));
//   }
// });



/************************************************
 * FINAL ROBUST SERVER
 * Graph + Multi Camera + Continuous Recording
 * Auto Health Logs + Auto Cleanup
 ************************************************/

const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = 4010;

/* ================= BASIC ================= */
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

/* ================= LOG DIR ================= */
const LOG_DIR = path.join(__dirname, "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });


/* ================= DAILY LOG HELPERS ================= */
function getTodayLogFile() {
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return path.join(LOG_DIR, `server_${dateStr}.log`);
}

function writeLog(message) {
  const time = new Date().toLocaleString();
  const line = `[${time}] ${message}\n`;
  fs.appendFile(getTodayLogFile(), line, err => {
    if (err) console.error("LOG WRITE ERROR:", err);
  });
}
/* ================= HEALTH LOG ================= */
setInterval(() => {
  Object.keys(cameraStatus).forEach(id => {
    const s = cameraStatus[id];
    if (s.running) {
      const diff = s.lastSeen ? Math.round((Date.now() - s.lastSeen) / 1000) : "N/A";
      writeLog(`🟢 ${id} RUNNING (last data ${diff}s ago)`);
    } else {
      writeLog(`🔴 ${id} DOWN (${s.lastError || "no data"})`);
    }
  });
}, 60000);

/* ================= MONGO ================= */
const uri = "mongodb://localhost:27017/mld";
const client = new MongoClient(uri);
let db;

async function connectToMongoDB() {
  await client.connect();
  db = client.db("mld");
  console.log("✅ MongoDB Connected");
}
function getCollection(name) {
  return db.collection(name);
}

/* ================= CAMERA CONFIG ================= */
const CAMERAS = {
  cam1: { rtsp: "rtsp://admin:Password%401@192.168.250.210:554/stream1" },
  cam2: { rtsp: "rtsp://admin:Password%401@192.168.250.215:554/stream1" },
  cam3: { rtsp: "rtsp://admin:Password%401@192.168.250.216:554/stream1" },
  cam4: { rtsp: "rtsp://admin:Password%401@192.168.250.217:554/stream1" }
};

/* ===== VIDEO STORAGE ===== */
Object.keys(CAMERAS).forEach(id => {
  CAMERAS[id].videoDir = path.join(__dirname, "videos", id);
  if (!fs.existsSync(CAMERAS[id].videoDir)) {
    fs.mkdirSync(CAMERAS[id].videoDir, { recursive: true });
  }
});

/* ================= CAMERA STATUS ================= */
const recordingProcesses = {};
const cameraStatus = {};

Object.keys(CAMERAS).forEach(id => {
  cameraStatus[id] = {
    running: false,
    lastSeen: null,
    lastError: null
  };
});

/* ================= START RECORDING ================= */
function startRecording(cameraId) {
  if (recordingProcesses[cameraId]) return;

  const cam = CAMERAS[cameraId];
  if (!cam) return;

  const outputPattern = path.join(
    cam.videoDir,
    `${cameraId}_%Y-%m-%d_%H-%M.mp4`
  );

  console.log(`🎥 Starting recording: ${cameraId}`);

  const proc = ffmpeg(cam.rtsp)
    .inputOptions([
      "-rtsp_transport tcp",
      "-fflags nobuffer",
      "-flags low_delay"
    ])
    .outputOptions([
      "-c:v libx264",
      "-preset ultrafast",
      "-f segment",
      "-segment_time 60",
      "-reset_timestamps 1",
      "-strftime 1"
    ])
    .output(outputPattern)
    .on("start", () => {
      cameraStatus[cameraId].running = true;
      cameraStatus[cameraId].lastError = null;
      console.log(`🟢 ${cameraId} RECORDING`);
    })
    .on("progress", () => {
      cameraStatus[cameraId].lastSeen = Date.now();
    })
    .on("error", err => {
      console.error(`🔴 ${cameraId} ERROR: ${err.message}`);
      cameraStatus[cameraId].running = false;
      cameraStatus[cameraId].lastError = err.message;
      recordingProcesses[cameraId] = null;

      setTimeout(() => startRecording(cameraId), 5000);
    })
    .on("end", () => {
      console.warn(`⚠️ ${cameraId} STOPPED`);
      cameraStatus[cameraId].running = false;
      recordingProcesses[cameraId] = null;

      setTimeout(() => startRecording(cameraId), 5000);
    })
    .run();

  recordingProcesses[cameraId] = proc;
}

/* ================= HEALTH LOG (CONSOLE) ================= */
setInterval(() => {
  console.log("📊 CAMERA HEALTH STATUS");
  Object.keys(cameraStatus).forEach(id => {
    const s = cameraStatus[id];
    if (s.running) {
      const diff = s.lastSeen
        ? Math.round((Date.now() - s.lastSeen) / 1000)
        : "N/A";
      console.log(`🟢 ${id} RUNNING (last data ${diff}s ago)`);
    } else {
      console.log(`🔴 ${id} DOWN (${s.lastError || "no data"})`);
    }
  });
  console.log("------------------------------------------------");
}, 60000);

/* ================= LOG FILE FUNCTIONS ================= */
function generateHealthLogText() {
  let text = "";
  text += "CAMERA HEALTH REPORT\n";
  text += "====================\n";
  text += `Generated: ${new Date().toLocaleString()}\n\n`;

  Object.keys(cameraStatus).forEach(id => {
    const s = cameraStatus[id];
    if (s.running) {
      text += `🟢 ${id} RUNNING\n`;
    } else {
      text += `🔴 ${id} DOWN - ${s.lastError || "No data"}\n`;
    }
  });

  return text;
}

function cleanupOldLogs(days = 30) {
  const now = Date.now();
  const maxAge = days * 24 * 60 * 60 * 1000;

  fs.readdir(LOG_DIR, (err, files) => {
    if (err) return;

    files.forEach(file => {
      const filePath = path.join(LOG_DIR, file);
      fs.stat(filePath, (err, stat) => {
        if (!err && now - stat.mtimeMs > maxAge) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}

// /* ================= LOG FILE CREATION ================= */
// /* ⏱️ EVERY 1 HOUR (change time if needed) */
// setInterval(() => {
//   const text = generateHealthLogText();
//   const fileName =
//     `camera_log_${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;

//   fs.writeFileSync(path.join(LOG_DIR, fileName), text, "utf8");
//   console.log(`📝 Log created: ${fileName}`);
// },  60 * 1000);//change duaration of log file

// /* 🧹 CLEANUP DAILY */
// setInterval(() => {
//   cleanupOldLogs(30);
// }, 24 * 60 * 60 * 1000);

/* ================= VIDEO PLAY API ================= */
app.get("/api/camera/video", (req, res) => {
  const { cameraId, ts } = req.query;
  if (!cameraId || !ts) return res.status(400).send("cameraId & ts required");

  const cam = CAMERAS[cameraId];
  if (!cam) return res.status(404).send("Invalid camera");

  const t = new Date(ts);
  const fileName = `${cameraId}_${t.getFullYear()}-${
    String(t.getMonth()+1).padStart(2,"0")
  }-${String(t.getDate()).padStart(2,"0")}_${
    String(t.getHours()).padStart(2,"0")
  }-${String(t.getMinutes()).padStart(2,"0")}.mp4`;

  const videoPath = path.join(cam.videoDir, fileName);
  if (!fs.existsSync(videoPath)) return res.status(404).send("Video not ready");

  res.sendFile(videoPath);
});

/* ================= GRAPH API (UNCHANGED) ================= */
// app.get("/graphdatax", async (req, res) => {
//   try {
//     const col = getCollection("pm");
//     const machines = await col.distinct("machineName");
//     const all = await col.find({}).sort({ timestamp: 1 }).toArray();

//     const dataByMachine = {};
//     machines.forEach(m => dataByMachine[m] = []);
//     all.forEach(r => r.machineName && dataByMachine[r.machineName].push(r));

//     res.json({ machines, dataByMachine });
//   } catch (e) {
//     res.status(500).send("graphdatax error");
//   }
// });

app.get("/graphdatax", async (req, res) => {
  try {
    const { machine, from, to, date } = req.query;
    const now = new Date();

    function getCurrentShiftStart(now) {
      const h = now.getHours();
      const d = new Date(now);
      if (h >= 6 && h < 14) d.setHours(6,0,0,0);
      else if (h >= 14 && h < 22) d.setHours(14,0,0,0);
      else {
        if (h < 6) d.setDate(d.getDate() - 1);
        d.setHours(22,0,0,0);
      }
      return d;
    }

    let startTime, endTime;
    if (date) {
      startTime = new Date(date); startTime.setHours(0,0,0,0);
      endTime = new Date(date); endTime.setHours(23,59,59,999);
    } else if (from && to) {
      startTime = new Date(from); startTime.setHours(0,0,0,0);
      endTime = new Date(to); endTime.setHours(23,59,59,999);
    } else {
      const cur = getCurrentShiftStart(now);
      startTime = new Date(cur.getTime() - 16*3600000);
      endTime = new Date(cur.getTime() + 8*3600000);
    }

    const baseQuery = {
      timestamp: { $gte: startTime, $lt: endTime },
      second: { $exists: true },
      second2: { $exists: true }
    };
    if (machine) baseQuery.machineName = machine;

    const col = getCollection("pm");

    if (machine) {
      const data = await col.find(baseQuery).sort({timestamp:1}).toArray();
      return res.json({ machines:[machine], dataByMachine:{[machine]:data} });
    }

    const machines = await col.distinct("machineName");
    const all = await col.find(baseQuery).sort({timestamp:1}).toArray();

    const dataByMachine = {};
    machines.forEach(m => dataByMachine[m]=[]);
    all.forEach(r => r.machineName && dataByMachine[r.machineName].push(r));

    res.json({ machines, dataByMachine });

  } catch (e) {
    console.error(e);
    res.status(500).send("graphdatax error");
  }
});

/* ======================================================
   VIDEO CLEANUP (DELETE FILES OLDER THAN N DAYS)
   ====================================================== */

function cleanupOldVideos(days = 7) {
  const now = Date.now();
  const maxAge = days * 24 * 60 * 60 * 1000;

  console.log(`🧹 Cleaning videos older than ${days} days...`);

  Object.keys(CAMERAS).forEach(camId => {
    const dir = CAMERAS[camId].videoDir;

    if (!fs.existsSync(dir)) return;

    fs.readdir(dir, (err, files) => {
      if (err) return;

      files.forEach(file => {
        if (!file.endsWith(".mp4")) return;

        const filePath = path.join(dir, file);

        fs.stat(filePath, (err, stat) => {
          if (err) return;

          if (now - stat.mtimeMs > maxAge) {
            fs.unlink(filePath, err => {
              if (!err) {
                console.log(`🗑️ Deleted: ${camId}/${file}`);
              }
            });
          }
        });
      });
    });
  });
}


/* ======================================================
   AUTO CLEANUP EVERY 24 HOURS
   ====================================================== */

// Run once at startup
cleanupOldVideos(7);

// Run every 24 hours
setInterval(() => {
  cleanupOldVideos(7);
}, 24 * 60 * 60 * 1000);


/* ======================================================
   MANUAL VIDEO CLEANUP API
   ====================================================== */
app.get("/api/cleanup/videos", (req, res) => {
  const days = Number(req.query.days) || 7;
  cleanupOldVideos(days);
  res.send(`✅ Videos older than ${days} days cleanup started`);
});


/* ================= START SERVER ================= */
app.listen(PORT, async () => {
  await connectToMongoDB();
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  for (const camId of Object.keys(CAMERAS)) {
    startRecording(camId);
    await new Promise(r => setTimeout(r, 4000));
  }
});
