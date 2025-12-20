const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const uri = "mongodb://localhost:27017/mld";
const client = new MongoClient(uri);
let db;

async function connectToMongoDB() {
  try {
    await client.connect();
    db = client.db("mld");
    console.log(" Connected to MongoDB");
  } catch (err) {
    console.error(" MongoDB connection error:", err);
  }
}

function getCollection(name) {
  return db.collection(name);
}
////++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ===== CAMERA RECORDING API =====
// // ===== CAMERA RECORDING (STABLE & AUTO) =====
// const ffmpeg = require("fluent-ffmpeg");
// const ffmpegPath = require("ffmpeg-static");
// const fs = require("fs");

// ffmpeg.setFfmpegPath(ffmpegPath);

// // Camera Config
// const username = "admin";
// const password = encodeURIComponent("Password@1");
// const CAMERA_RTSP = `rtsp://${username}:${password}@192.168.250.210:554/stream1`;
// const VIDEO_DIR = path.join(__dirname, "videos", "cam1");

// if (!fs.existsSync(VIDEO_DIR)) {
//   fs.mkdirSync(VIDEO_DIR, { recursive: true });
// }

// // Globals
// let recordingProcess = null;
// let currentRecordingDate = null;

// // Helper
// function getTodayDate() {
//   return new Date().toISOString().split("T")[0];
// }

// // 🎥 Start Recording (auto + manual)
// function startRecording(force = false) {
//   const today = getTodayDate();

//   // Already running for today
//   if (recordingProcess && currentRecordingDate === today && !force) {
//     console.log("🎥 Recording already running for today");
//     return;
//   }

//   // Date change → stop old recording
//   if (recordingProcess && currentRecordingDate !== today) {
//     console.log("🔄 Date changed, restarting recording");
//     recordingProcess.kill("SIGINT");
//     recordingProcess = null;
//   }

//   const outputFile = path.join(VIDEO_DIR, `${today}.mp4`);
//   currentRecordingDate = today;

//   recordingProcess = ffmpeg(CAMERA_RTSP)
//     .addOptions([
//       "-rtsp_transport tcp",
//       "-fflags +genpts",
//       "-use_wallclock_as_timestamps 1"
//     ])
//     .outputOptions([
//       "-c:v libx264",
//       "-preset veryfast",
//       "-movflags +faststart"
//     ])
//     .save(outputFile)
//     .on("start", () => {
//       console.log("🎥 Recording started:", outputFile);
//     })
//     .on("error", err => {
//       console.error("❌ FFmpeg recording error:", err);
//       recordingProcess = null;
//     })
//     .on("end", () => {
//       console.log("🛑 Recording stopped");
//       recordingProcess = null;
//     });
// }

// // ▶ Manual Start API
// app.get("/api/camera/start", (req, res) => {
//   startRecording(true);
//   res.json({ message: "Camera recording started" });
// });

// // ⏹ Stop API
// app.get("/api/camera/stop", (req, res) => {
//   if (!recordingProcess) {
//     return res.json({ message: "No active recording" });
//   }

//   recordingProcess.kill("SIGINT");
//   recordingProcess = null;

//   res.json({ message: "Camera recording stopped" });
// });

// // 📼 Play Today Video
// app.get("/api/camera/video", (req, res) => {
//   const today = getTodayDate();
//   const videoPath = path.join(VIDEO_DIR, `${today}.mp4`);

//   if (!fs.existsSync(videoPath)) {
//     return res.status(404).send("Video not found");
//   }

//   res.sendFile(videoPath);
// });


// // ===== VIDEO PLAY API =====
// app.get("/api/camera/video", (req, res) => {
//   const { time } = req.query; // seconds
//   const today = new Date().toISOString().split("T")[0];
//   const videoPath = path.join(VIDEO_DIR, `${today}.mp4`);

//   if (!fs.existsSync(videoPath)) {
//     return res.status(404).send("Video not found");
//   }

//   res.sendFile(videoPath);
// });


// const HLS_DIR = path.join(__dirname, "public", "hls");

// if (!fs.existsSync(HLS_DIR)) {
//   fs.mkdirSync(HLS_DIR, { recursive: true });
// }
// ////
// function startHLS() {
//   ffmpeg(CAMERA_RTSP)
//     .addOptions([
//       "-rtsp_transport tcp",
//       "-fflags nobuffer",
//       "-flags low_delay",
//       "-hls_time 4",
//       "-hls_list_size 6",
//       "-hls_flags delete_segments+append_list"
//     ])
//     .output(path.join(HLS_DIR, "live.m3u8"))
//     .on("start", () => console.log("📡 LIVE HLS started"))
//     .on("error", err => console.error("❌ HLS error", err))
//     .run();
// }

// startHLS();

// ================= CAMERA FINAL MODULE =================
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

const fs = require("fs");


ffmpeg.setFfmpegPath(ffmpegPath);

// 🔧 CAMERA CONFIG
const CAMERA_RTSP = "rtsp://admin:Password%401@192.168.250.210:554/stream1";
const VIDEO_DIR = path.join(__dirname, "videos", "cam1");
const HLS_DIR = path.join(__dirname, "public", "hls");

if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
if (!fs.existsSync(HLS_DIR)) fs.mkdirSync(HLS_DIR, { recursive: true });

let recordProcess = null;
let hlsProcess = null;
/* ======================================================
   1️⃣ AUTO RECORDING — minuts WISE FILES
   ====================================================== */
function startOneMinuteRecording(){
  if(recordProcess){
    console.log("⏱ Recording already running");
    return;
  }

  const outputPattern = path.join(
    VIDEO_DIR,
    "cam1_%Y-%m-%d_%H-%M.mp4"
  );

  recordProcess = ffmpeg(CAMERA_RTSP)
    .addOptions([
      "-rtsp_transport tcp",
      "-c:v libx264",
      "-preset ultrafast",
      "-f segment",
      "-segment_time 60",       // ✅ 1 minute
      "-reset_timestamps 1",
      "-strftime 1"
    ])
    .output(outputPattern)
    .on("start", cmd => {
      console.log("🎥 1-minute recording started");
      console.log(cmd);
    })
    .on("error", err => {
      console.error("❌ FFmpeg error:", err.message);
      recordProcess = null;
    })
    .run();
}


/* ======================================================
   1️⃣ AUTO RECORDING — HOUR WISE FILES
   ====================================================== */
// function startHourlyRecording() {
//   if (recordProcess) {
//     console.log("🎥 Recording already running");
//     return;
//   }

//   const outputPattern = path.join(
//     VIDEO_DIR,
//     "cam1_%Y-%m-%d_%H-00.mp4"
//   );

//   recordProcess = ffmpeg(CAMERA_RTSP)
//     .addOptions([
//       "-rtsp_transport tcp",
//       "-c:v libx264",
//       "-preset veryfast",
//       "-f segment",
//       "-segment_time 3600", // 1 hour
//       "-reset_timestamps 1",
//       "-strftime 1"
//     ])
//     .output(outputPattern)
//     .on("start", () => console.log("🎥 Hour-wise recording started"))
//     .on("error", err => {
//       console.error("❌ Recording error:", err);
//       recordProcess = null;
//     })
//     .run();
// }

/* ======================================================
   2️⃣ LIVE VIDEO — HLS STREAM
   ====================================================== */
function startLiveHLS() {
  if (hlsProcess) return;

  hlsProcess = ffmpeg(CAMERA_RTSP)
    .addOptions([
      "-rtsp_transport tcp",
      "-fflags nobuffer",
      "-flags low_delay",
      "-hls_time 4",
      "-hls_list_size 6",
      "-hls_flags delete_segments+append_list"
    ])
    .output(path.join(HLS_DIR, "live.m3u8"))
    .on("start", () => console.log("📡 LIVE HLS started"))
    .on("error", err => console.error("❌ HLS error:", err))
    .run();
}

/* ======================================================
   3️⃣ GRAPH CLICK → RECORDED VIDEO API
   ====================================================== */
// app.get("/api/camera/video", (req, res) => {
//   const { ts } = req.query;
//   if (!ts) return res.status(400).send("timestamp required");

//   const t = new Date(ts);
//   t.setMinutes(0, 0, 0); // nearest hour

//   const fileName = `cam1_${t.getFullYear()}-${
//     String(t.getMonth() + 1).padStart(2, "0")
//   }-${String(t.getDate()).padStart(2, "0")}_${
//     String(t.getHours()).padStart(2, "0")
//   }-00.mp4`;

//   const videoPath = path.join(VIDEO_DIR, fileName);

//   if (!fs.existsSync(videoPath)) {
//     return res.status(404).send("Video not available yet");
//   }

//   res.sendFile(videoPath);
// });

app.get("/api/camera/video", (req, res) => {
  const { ts } = req.query;
  if (!ts) return res.status(400).send("timestamp required");

  const t = new Date(ts);

  const fileName = `cam1_${t.getFullYear()}-${
    String(t.getMonth()+1).padStart(2,'0')
  }-${String(t.getDate()).padStart(2,'0')}_${
    String(t.getHours()).padStart(2,'0')
  }-${String(t.getMinutes()).padStart(2,'0')}.mp4`;

  const videoPath = path.join(VIDEO_DIR, fileName);

  if (!fs.existsSync(videoPath)) {
    return res.status(404).send("1-minute video not ready");
  }

  res.sendFile(videoPath);
});


/* ======================================================
   4️⃣ AUTO DELETE — 7 DAYS OLD FILES
   ====================================================== */
function cleanupOldVideos() {
  const files = fs.readdirSync(VIDEO_DIR);
  const now = Date.now();

  files.forEach(file => {
    const p = path.join(VIDEO_DIR, file);
    const ageDays = (now - fs.statSync(p).mtimeMs) / 86400000;

    if (ageDays > 7) {
      fs.unlinkSync(p);
      console.log("🗑️ Deleted:", file);
    }
  });
}

// Cleanup every 12 hours
setInterval(cleanupOldVideos, 12 * 60 * 60 * 1000);

// ======================================================


///++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


///////////////////////last two shift data inclueded current shift line chart
app.get('/graphdata', async (req, res) => {
  try {
    const now = new Date();

 // Function to determine the current shift start based on time
    function getCurrentShiftStart(now) {
      const hour = now.getHours();
      const shiftStart = new Date(now);

      if (hour >= 6 && hour < 14) {
        // A shift
        shiftStart.setHours(6, 0, 0, 0);
      } else if (hour >= 14 && hour < 22) {
        // B shift
        shiftStart.setHours(14, 0, 0, 0);
      } else {
        // C shift
        if (hour >= 22) {
          shiftStart.setHours(22, 0, 0, 0);
        } else {
          // Between 12 AM and 6 AM — it's still C shift of previous day
          shiftStart.setDate(shiftStart.getDate() - 1);
          shiftStart.setHours(22, 0, 0, 0);
        }
      }

      return shiftStart;
    }

    const currentShiftStart = getCurrentShiftStart(now);

    // Previous shift start (subtract 8 hours each)
    const prevShiftStart = new Date(currentShiftStart.getTime() - 8 * 60 * 60 * 1000);
    const prevPrevShiftStart = new Date(prevShiftStart.getTime() - 8 * 60 * 60 * 1000);

    // End of current shift (8 hours after current shift start)
    const endTime = new Date(currentShiftStart.getTime() + 8 * 60 * 60 * 1000);
    const data = await getCollection("pm")
      .find({
        timestamp: { $gte: prevPrevShiftStart, $lt: endTime },
        second: { $exists: true },
        second2: { $exists: true }
      })
      .sort({ timestamp: 1 })
      .toArray();

    res.json(data);
  } catch (err) {
    console.error("Error in /graphdata:", err);
    res.status(500).send("Error fetching graph data");
  }
});
////////image
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.get('/api/daily-image', (req, res) => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const imageName = `${day}.jpg`;
  const imageUrl = `/images/${imageName}`;
  res.json({ imageUrl });
});



// Merged CT and PM data (10 records)
app.get('/merged-chart-data', async (req, res) => {
  try {
    const pmData = await getCollection("pm")
      .find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    const ctData = await getCollection("CT")
      .find({ name: "Alternator Rotor-2" })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    pmData.reverse();
    ctData.reverse();

    const merged = [];
    for (let i = 0; i < Math.min(pmData.length, ctData.length); i++) {
      merged.push({
        timestamp: pmData[i].timestamp || ctData[i].timestamp,
        second: pmData[i].second,
        ctValue: ctData[i].CT
      });
    }

    res.json(merged);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching merged chart data");
  }
});

// Plan vs Actual (latest)
app.get('/plan-vs-actual', async (req, res) => {
  try {
    const planDoc = await getCollection("plan").find().sort({ timestamp: -1 }).limit(1).toArray();
    const pmDoc = await getCollection("pm").find().sort({ timestamp: -1 }).limit(1).toArray();

    if (!planDoc.length || !pmDoc.length) return res.status(404).json({ error: "Missing data" });

    const plan = planDoc[0].plan || 0;
    const count = pmDoc[0].count || 0;
    const percentage = plan > 0 ? (count / plan) * 100 : 0;

    res.json({ plan, count, percentage: percentage.toFixed(2) });
  } catch (err) {
    res.status(500).send("Error fetching plan vs actual data");
  }
});
////

// New API to return min, max and actual CT of current shift
app.get('/ct-range', async (req, res) => {
  try {
    const now = new Date();
    let shiftStart = new Date();
    let shiftEnd = new Date();

    if (now.getHours() >= 6 && now.getHours() < 14) {
      shiftStart.setHours(6, 0, 0, 0);
      shiftEnd.setHours(14, 0, 0, 0);
    } else if (now.getHours() >= 14 && now.getHours() < 22) {
      shiftStart.setHours(14, 0, 0, 0);
      shiftEnd.setHours(22, 0, 0, 0);
    } else {
      if (now.getHours() < 6) shiftStart.setDate(shiftStart.getDate() - 1);
      shiftStart.setHours(22, 0, 0, 0);
      shiftEnd = new Date(shiftStart);
      shiftEnd.setHours(6 + 24, 0, 0, 0);
    }

    // Fetch all CT records of current shift
    const collection = getCollection("pm");
    const data = await collection.find({
      timestamp: { $gte: shiftStart, $lt: shiftEnd },
      second: { $exists: true }
    }).sort({ timestamp: 1 }).toArray();

    if (data.length === 0) {
      return res.json({ min: null, max: null, actual: null });
    }

    // Array of CT values
    const values = data.map(d => d.second);

    const min = Math.min(...values);
    const max = Math.max(...values);

    // 👉 Latest part ka actual CT (the last record)
    const actual = data[data.length - 1].second;

    res.json({ min, max, actual });

  } catch (err) {
    console.error("❌ Error in /ct-range:", err);
    res.status(500).send("Error calculating CT range");
  }
});

///
app.get('/ct-ranges', async (req, res) => {
  try {
    const now = new Date();

    function getShiftBoundaries(date) {
      let start = new Date(date);
      let end = new Date(date);
      let name = '';

      const hour = date.getHours();

      if (hour >= 6 && hour < 14) { // A Shift
        start.setHours(6, 0, 0, 0);
        end.setHours(14, 0, 0, 0);
        name = 'A Shift';
      } else if (hour >= 14 && hour < 22) { // B Shift
        start.setHours(14, 0, 0, 0);
        end.setHours(22, 0, 0, 0);
        name = 'B Shift';
      } else { // C Shift
        if (hour < 6) start.setDate(start.getDate() - 1);
        start.setHours(22, 0, 0, 0);
        end = new Date(start);
        end.setHours(6 + 24, 0, 0, 0);
        name = 'C Shift';
      }
      return { start, end, name };
    }

    // Get current shift
    const currentShift = getShiftBoundaries(now);

    // Get previous two shifts in reverse order
    function getPreviousShift(shift) {
      let prevDate = new Date(shift.start);
      prevDate.setHours(prevDate.getHours() - 1); // Move back 1 hour to be in previous shift
      return getShiftBoundaries(prevDate);
    }

    const prevShift1 = getPreviousShift(currentShift);
    const prevShift2 = getPreviousShift(prevShift1);

    async function getShiftAvg(start, end) {
      const data = await getCollection("pm").find({
        timestamp: { $gte: start, $lt: end },
        second: { $exists: true }
      }).toArray();

      if (!data.length) return null;
      const avg = data.reduce((sum, d) => sum + d.second, 0) / data.length;
      return parseFloat(avg.toFixed(2));
    }

    const result = [];
    for (let shift of [currentShift, prevShift1, prevShift2]) {
      const avgCT = await getShiftAvg(shift.start, shift.end);
      result.push({
        shift: shift.name,
        from: shift.start.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        to: shift.end.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        avgCT: avgCT
      });
    }

    res.json(result);

  } catch (err) {
    console.error("❌ Error in /ct-ranges:", err);
    res.status(500).send("Error calculating CT averages");
  }
});

////day OR///
app.get('/today-or', async (req, res) => {
  try {
    const now = new Date();

    // Define shift boundaries
    const shiftAStart = new Date();
    shiftAStart.setHours(6, 0, 0, 0);
    const shiftAEnd = new Date(shiftAStart);
    shiftAEnd.setHours(14, 0, 0, 0);

    const shiftBStart = new Date(shiftAEnd);
    const shiftBEnd = new Date(shiftBStart);
    shiftBEnd.setHours(22, 0, 0, 0);

    const shiftCStart = new Date(shiftBEnd);
    const shiftCEnd = new Date(shiftCStart);
    shiftCEnd.setDate(shiftCEnd.getDate() + 1);  // next day
    shiftCEnd.setHours(6, 0, 0, 0);

    // Get last record in each shift
    async function getLastPlanCount(start, end) {
      const plan = await getCollection("plan")
        .find({ timestamp: { $gte: start, $lt: end } })
        .sort({ timestamp: -1 }).limit(1).toArray();

      const count = await getCollection("pm")
        .find({ timestamp: { $gte: start, $lt: end } })
        .sort({ timestamp: -1 }).limit(1).toArray();

      return {
        plan: plan[0]?.plan || 0,
        count: count[0]?.count || 0
      };
    }

    const shiftA = await getLastPlanCount(shiftAStart, shiftAEnd);
    const shiftB = await getLastPlanCount(shiftBStart, shiftBEnd);
    const shiftC = await getLastPlanCount(shiftCStart, shiftCEnd);

    const totalPlan = shiftA.plan + shiftB.plan + shiftC.plan;
    const totalCount = shiftA.count + shiftB.count + shiftC.count;
    const or = totalPlan > 0 ? ((totalCount / totalPlan) * 100).toFixed(2) : "0.00";

    res.json({ plan: totalPlan, actual: totalCount, or });
  } catch (err) {
    console.error("❌ Error in /today-or:", err);
    res.status(500).send("Error calculating today's OR");
  }
});

////week OR///
app.get('/weekly-or', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(6, 0, 0, 0); // Today 6AM base

    const resultORs = [];

    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i); // i days back

      const shiftAStart = new Date(dayStart);
      const shiftAEnd = new Date(shiftAStart);
      shiftAEnd.setHours(14, 0, 0, 0);

      const shiftBStart = new Date(shiftAEnd);
      const shiftBEnd = new Date(shiftBStart);
      shiftBEnd.setHours(22, 0, 0, 0);

      const shiftCStart = new Date(shiftBEnd);
      const shiftCEnd = new Date(shiftCStart);
      shiftCEnd.setDate(shiftCEnd.getDate() + 1);
      shiftCEnd.setHours(6, 0, 0, 0);

      async function getLastPlanCount(start, end) {
        const plan = await getCollection("plan").find({ timestamp: { $gte: start, $lt: end } }).sort({ timestamp: -1 }).limit(1).toArray();
        const count = await getCollection("pm").find({ timestamp: { $gte: start, $lt: end } }).sort({ timestamp: -1 }).limit(1).toArray();
        return {
          plan: plan[0]?.plan || 0,
          count: count[0]?.count || 0
        };
      }

      const shiftA = await getLastPlanCount(shiftAStart, shiftAEnd);
      const shiftB = await getLastPlanCount(shiftBStart, shiftBEnd);
      const shiftC = await getLastPlanCount(shiftCStart, shiftCEnd);

      // Agar kisi shift ka count < 100 hai, skip the whole day
      if (shiftA.count < 100 || shiftB.count < 100 || shiftC.count < 100) {
        
        continue;
      }

      const dayPlan = shiftA.plan + shiftB.plan + shiftC.plan;
      const dayCount = shiftA.count + shiftB.count + shiftC.count;
      const dayOR = dayPlan > 0 ? (dayCount / dayPlan) * 100 : 0;

      resultORs.push(dayOR);
    }

    const avgOR = resultORs.length > 0 ? resultORs.reduce((a, b) => a + b, 0) / resultORs.length : 0;
    res.json({ averageOR: avgOR.toFixed(2) });
  } catch (err) {
    console.error("❌ Error in /weekly-or:", err);
    res.status(500).send("Error calculating weekly OR");
  }
});




// Hourly Summary (current shift)
// Hourly Summary (fixed: live data for current hour, diff logic for past hours)
app.get('/hourly-summary', async (req, res) => {
  try {
    const now = new Date();
    let shiftStart = new Date();
    let shiftEnd = new Date();

    // Shift range calculation
    if (now.getHours() >= 6 && now.getHours() < 14) {
      shiftStart.setHours(6, 0, 0, 0);
      shiftEnd.setHours(14, 0, 0, 0);
    } else if (now.getHours() >= 14 && now.getHours() < 22) {
      shiftStart.setHours(14, 0, 0, 0);
      shiftEnd.setHours(22, 0, 0, 0);
    } else {
      if (now.getHours() < 6) shiftStart.setDate(shiftStart.getDate() - 1);
      shiftStart.setHours(22, 0, 0, 0);
      shiftEnd = new Date(shiftStart);
      shiftEnd.setHours(6 + 24, 0, 0, 0);
    }

    const planData = await getCollection("plan")
      .find({ timestamp: { $gte: shiftStart, $lt: shiftEnd } })
      .sort({ timestamp: 1 })
      .toArray();

    const pmData = await getCollection("pm")
      .find({ timestamp: { $gte: shiftStart, $lt: shiftEnd } })
      .sort({ timestamp: 1 })
      .toArray();

    const summary = [];

    for (let i = 0; i < 8; i++) {
      const from = new Date(shiftStart);
      from.setHours(from.getHours() + i);
      const to = new Date(from);
      to.setHours(to.getHours() + 1);

      const isCurrentHour = now >= from && now < to;

      let hourPlan = 0;
      let hourActual = 0;

      if (isCurrentHour) {
        // 📦 Current hour – use latest value inside hour minus latest before hour
        const livePlanDoc = planData.filter(d => d.timestamp >= from && d.timestamp < to).at(-1);
        const prevPlanDoc = planData.filter(d => d.timestamp < from).at(-1);
        hourPlan = Math.max((livePlanDoc?.plan || 0) - (prevPlanDoc?.plan || 0), 0);

        const liveActualDoc = pmData.filter(d => d.timestamp >= from && d.timestamp < to).at(-1);
        const prevActualDoc = pmData.filter(d => d.timestamp < from).at(-1);
        hourActual = Math.max((liveActualDoc?.count || 0) - (prevActualDoc?.count || 0), 0);
      } else {
        // ⏮️ Past hour – difference from last in that hour and before it
        const endPlanDoc = planData.filter(d => d.timestamp >= from && d.timestamp < to).at(-1);
        const startPlanDoc = planData.filter(d => d.timestamp < from).at(-1);
        hourPlan = Math.max((endPlanDoc?.plan || 0) - (startPlanDoc?.plan || 0), 0);

        const endActualDoc = pmData.filter(d => d.timestamp >= from && d.timestamp < to).at(-1);
        const startActualDoc = pmData.filter(d => d.timestamp < from).at(-1);
        hourActual = Math.max((endActualDoc?.count || 0) - (startActualDoc?.count || 0), 0);
      }

      const or = hourPlan > 0 ? ((hourActual / hourPlan) * 100).toFixed(2) : '0.00';

      summary.push({
        hour: `${from.getHours().toString().padStart(2, '0')}:00 - ${to.getHours().toString().padStart(2, '0')}:00`,
        plan: hourPlan,
        actual: hourActual,
        or
      });
    }

    res.json(summary);
  } catch (err) {
    console.error("❌ Error generating hourly summary:", err);
    res.status(500).send("Error generating hourly summary");
  }
});


// 24-Hour Summary
app.get('/daily-summary', async (req, res) => {
  try {
    const now = new Date();

    const start = new Date(now);
    start.setDate(start.getDate() - 6); // 7 days back
    start.setHours(6, 0, 0, 0); // Start from 6 AM of 7 days ago

    const end = new Date(now);
    if (now.getHours() < 6) {
      end.setDate(end.getDate());
    } else {
      end.setDate(end.getDate() + 1);
    }
    end.setHours(6, 0, 0, 0); // end till tomorrow 6AM

    const planData = await getCollection("plan").find({
      timestamp: { $gte: start, $lt: end }
    }).sort({ timestamp: 1 }).toArray();

    const pmData = await getCollection("pm").find({
      timestamp: { $gte: start, $lt: end }
    }).sort({ timestamp: 1 }).toArray();

    const result = [];

    for (let i = 0; i < 168; i++) {
      const from = new Date(start);
      from.setHours(from.getHours() + i);
      const to = new Date(from);
      to.setHours(to.getHours() + 1);

      const hourPlan = planData
        .filter(d => d.timestamp >= from && d.timestamp < to)
        .at(-1)?.plan || 0;

      const hourActual = pmData
        .filter(d => d.timestamp >= from && d.timestamp < to)
        .at(-1)?.count || 0;

      result.push({
        hour: from.toLocaleString('en-IN', {
          day: '2-digit', month: '2-digit', hour: '2-digit', hour12: false
        }), // "28/07, 13"
        plan: hourPlan,
        actual: hourActual,
        or: hourPlan > 0 ? (hourActual / hourPlan) * 100 : 0
      });
    }

    res.json(result);
  } catch (err) {
    console.error("❌ Error generating 7-day hourly summary", err);
    res.status(500).send("Error generating summary");
  }
});


// API: Get CT frequency distribution one month data
app.get('/ct-frequency', async (req, res) => {
  try {
    const collection = getCollection("pm");

    const now = new Date();

    // first day of month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1); // first day of next month

    // Mongo aggregation pipeline
    const pipeline = [
      {
        $match: {
          timestamp: { $gte: monthStart, $lt: monthEnd },
          second: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: "$second",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const result = await collection.aggregate(pipeline).toArray();

    // Response format same rakhne ke liye
    const formatted = {
      [`Monthly Data (${monthStart.toLocaleDateString()} - ${now.toLocaleDateString()})`]: {
        labels: result.map(r => r._id.toString()),
        counts: result.map(r => r.count)
      }
    };

    res.json(formatted);

  } catch (err) {
    console.error("❌ Error in CT frequency monthly:", err);
    res.status(500).send("Error fetching CT frequency monthly");
  }
});



/////shift wise summary
app.get('/shift-wise-summary', async (req, res) => {
  try {
    const now = new Date();

    const start = new Date();
    start.setDate(now.getDate() - 6); // 7 days ago
    start.setHours(6, 0, 0, 0); // Start at 6AM of that day

    const end = new Date(now);
    if (now.getHours() < 6) {
      end.setDate(end.getDate()); // still today before 6AM
    } else {
      end.setDate(end.getDate() + 1);
    }
    end.setHours(6, 0, 0, 0); // End at tomorrow 6AM

    const planData = await getCollection("plan").find({
      timestamp: { $gte: start, $lt: end }
    }).sort({ timestamp: 1 }).toArray();

    const pmData = await getCollection("pm").find({
      timestamp: { $gte: start, $lt: end }
    }).sort({ timestamp: 1 }).toArray();

    const result = [];

    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + d);

      const shifts = [
        { label: 'A', from: new Date(day.setHours(6, 0, 0, 0)), to: new Date(day.setHours(14, 0, 0, 0)) },
        { label: 'B', from: new Date(day.setHours(14, 0, 0, 0)), to: new Date(day.setHours(22, 0, 0, 0)) },
        {
          label: 'C',
          from: new Date(day.setHours(22, 0, 0, 0)),
          to: new Date(new Date(day).setDate(day.getDate() + 1)).setHours(6, 0, 0, 0)
        }
      ];

      for (const shift of shifts) {
        const from = new Date(shift.from);
        const to = new Date(shift.to);

        const shiftPlan = planData
          .filter(d => d.timestamp >= from && d.timestamp < to)
          .at(-1)?.plan || 0;

        const shiftActual = pmData
          .filter(d => d.timestamp >= from && d.timestamp < to)
          .at(-1)?.count || 0;

        result.push({
          shift: `${from.toLocaleDateString('en-IN')} (${shift.label})`,
          plan: shiftPlan,
          actual: shiftActual,
          or: shiftPlan > 0 ? (shiftActual / shiftPlan) * 100 : 0
        });
      }
    }

    res.json(result);
  } catch (err) {
    console.error("❌ Error in shift-wise summary:", err);
    res.status(500).send("Error generating shift-wise summary");
  }
});

//
app.get('/shift-wise-summary2', async (req, res) => {
  try {
    const now = new Date();

    // 🔥 Monthly Cumulative Start (1st date 6AM)
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 6, 0, 0);

    // 🔥 Monthly Cumulative End (next 6AM)
    const end = new Date(now);
    if (now.getHours() < 6) {
      end.setHours(6, 0, 0, 0);
    } else {
      end.setDate(end.getDate() + 1);
      end.setHours(6, 0, 0, 0);
    }

    const planData = await getCollection("plan").find({
      timestamp: { $gte: start, $lt: end }
    }).sort({ timestamp: 1 }).toArray();

    const pmData = await getCollection("pm").find({
      timestamp: { $gte: start, $lt: end }
    }).sort({ timestamp: 1 }).toArray();

    const result = [];

    // 🔁 Entire month loop (same logic)
    const totalDays = Math.ceil((end - start) / (24 * 60 * 60 * 1000));

    for (let d = 0; d < totalDays; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + d);

      const shifts = [
        { label: 'A', from: new Date(day.setHours(6, 0, 0, 0)), to: new Date(day.setHours(14, 0, 0, 0)) },
        { label: 'B', from: new Date(day.setHours(14, 0, 0, 0)), to: new Date(day.setHours(22, 0, 0, 0)) },
        {
          label: 'C',
          from: new Date(day.setHours(22, 0, 0, 0)),
          to: new Date(new Date(day).setDate(day.getDate() + 1)).setHours(6, 0, 0, 0)
        }
      ];

      for (const shift of shifts) {
        const from = new Date(shift.from);
        const to = new Date(shift.to);

        const shiftPlan = planData
          .filter(d => d.timestamp >= from && d.timestamp < to)
          .at(-1)?.plan || 0;

        const shiftActual = pmData
          .filter(d => d.timestamp >= from && d.timestamp < to)
          .at(-1)?.count || 0;

        result.push({
          shift: `${from.toLocaleDateString('en-IN')} (${shift.label})`,
          plan: shiftPlan,
          actual: shiftActual
        });
      }
    }

    res.json(result);

  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).send("Error generating monthly summary");
  }
});

// Route: /ct-mp
app.get('/ct-mp', async (req, res) => {
  try {
    const result = await db
      .collection("CT")
      .findOne(
        { name: "Alternator Rotor-2" },
        { projection: { CT: 1, MP: 1, Remarks: 1,_id: 0 } }
      );
    if (result) {
      res.json(result);
    } else {
      res.status(404).json({ error: "No data found" });
    }
  } catch (err) {
    console.error("Error fetching CT and MP:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});




// Current Hour Summary (with emoji)
//  API: Current Hour Summary
//  API: Current Hour Summary (with actual = current - previous hour count)
    app.get('/current-hour-summary', async (req, res) => {
  try {
    const now = new Date();
    const currentHourStart = new Date(now.setMinutes(0, 0, 0));
    const currentHourEnd = new Date(currentHourStart);
    currentHourEnd.setHours(currentHourEnd.getHours() + 1);

    const lastHourStart = new Date(currentHourStart);
    lastHourStart.setHours(lastHourStart.getHours() - 1);

    // 🟢 Current hour's latest values
    const currentPlanDoc = await getCollection("plan")
      .find({ timestamp: { $gte: currentHourStart, $lt: currentHourEnd } })
      .sort({ timestamp: -1 }).limit(1).toArray();

    const currentPMDoc = await getCollection("pm")
      .find({ timestamp: { $gte: currentHourStart, $lt: currentHourEnd } })
      .sort({ timestamp: -1 }).limit(1).toArray();

    // 🔵 Previous hour's latest values
    const prevPlanDoc = await getCollection("plan")
      .find({ timestamp: { $gte: lastHourStart, $lt: currentHourStart } })
      .sort({ timestamp: -1 }).limit(1).toArray();

    const prevPMDoc = await getCollection("pm")
      .find({ timestamp: { $gte: lastHourStart, $lt: currentHourStart } })
      .sort({ timestamp: -1 }).limit(1).toArray();

    // ✅ Calculate deltas
    const currentPlan = currentPlanDoc[0]?.plan || 0;
    const prevPlan = prevPlanDoc[0]?.plan || 0;
    const plan = Math.max(currentPlan - prevPlan, 0); // avoid negative

    const currentCount = currentPMDoc[0]?.count || 0;
    const prevCount = prevPMDoc[0]?.count || 0;
    const actual = Math.max(currentCount - prevCount, 0); // avoid negative

    const or = plan > 0 ? ((actual / plan) * 100).toFixed(2) : "0.00";

    // 😊😞 Emoji based on OR
    let color = "green";
    let emoji = "😊";
    if (or < 85) {
      color = "red";
      emoji = "😞";
    }

    res.json({ plan, actual, or, color, emoji });
  } catch (err) {
    console.error("❌ Error in /current-hour-summary:", err);
    res.status(500).send("Error generating current hour summary");
  }
});
////// Express route (in your backend server file)
function findNearestData(dataArray, timestamp) {
  let closest = null;
  let minDiff = Infinity;

  for (const d of dataArray) {
    const diff = Math.abs(new Date(d.timestamp) - new Date(timestamp));
    if (diff < minDiff) {
      minDiff = diff;
      closest = d;
    }
  }
  return closest;
}
///OR of shift
app.get('/or-distribution', async (req, res) => {
  try {
    const now = new Date();
    let shiftStart = new Date();

    // Shift calculation
    if (now.getHours() >= 6 && now.getHours() < 14) {
      shiftStart.setHours(6, 0, 0, 0);
    } else if (now.getHours() >= 14 && now.getHours() < 22) {
      shiftStart.setHours(14, 0, 0, 0);
    } else {
      if (now.getHours() < 6) shiftStart.setDate(shiftStart.getDate() - 1);
      shiftStart.setHours(22, 0, 0, 0);
    }
    const shiftEnd = new Date(shiftStart);
    shiftEnd.setHours(shiftStart.getHours() + 8);

    const pmData = await getCollection('pm')
      .find({ timestamp: { $gte: shiftStart, $lt: shiftEnd } })
      .sort({ timestamp: 1 })
      .toArray();

    const planData = await getCollection('plan')
      .find({ timestamp: { $gte: shiftStart, $lt: shiftEnd } })
      .sort({ timestamp: 1 })
      .toArray();

    function findNearestData(dataArray, timestamp) {
      return dataArray.reduce((closest, curr) => {
        const currDiff = Math.abs(new Date(curr.timestamp) - new Date(timestamp));
        const closestDiff = Math.abs(new Date(closest?.timestamp || 0) - new Date(timestamp));
        return currDiff < closestDiff ? curr : closest;
      }, null);
    }

    const orPercentages = [];

    for (let i = 1; i < pmData.length; i++) {
      const current = pmData[i];
      const previous = pmData[i - 1];

      const deltaActual = current.count - previous.count;

      const currentPlan = findNearestData(planData, current.timestamp);
      const previousPlan = findNearestData(planData, previous.timestamp);
      const deltaPlan = (currentPlan?.plan ?? 0) - (previousPlan?.plan ?? 0);

      const or = deltaPlan > 0 ? (deltaActual / deltaPlan) * 100 : 0;
      orPercentages.push(Math.min(Math.max(or, 0), 100));  // Clamp between 0–100
    }

    // Initialize 100 buckets for 1–1%
    const distribution = Array(100).fill(0);
    orPercentages.forEach(or => {
      const index = Math.min(Math.floor(or), 99);
      distribution[index]++;
    });

    const result = distribution.map((count, i) => ({
      range: `${i}-${i + 1}%`,
      count
    }));

    res.json(result);
  } catch (err) {
    console.error('❌ OR Distribution API error:', err);
    res.status(500).send('Internal Server Error');
  }
});




// Generic CRUD
app.get('/data', async (req, res) => {
  try {
    const collectionName = req.query.collection || "pm";
    const data = await getCollection(collectionName).find({}).toArray();
    res.json(data);
  } catch (err) {
    res.status(500).send("Error fetching data");
  }
});

app.post('/submit', async (req, res) => {
  try {
    const collectionName = req.query.collection || "CT";
    const newData = { ...req.body, timestamp: new Date() };
    await getCollection(collectionName).insertOne(newData);
    res.redirect('/');
  } catch (err) {
    res.status(500).send("Error inserting data");
  }
});

app.put('/update/:id', async (req, res) => {
  try {
    const collectionName = req.query.collection || "CT"; // Dynamic collection name
    const { name, CT, MP, Remarks } = req.body; // Input fields
    await getCollection(collectionName).updateOne(
      { _id: new ObjectId(req.params.id) }, // Find by ID
      { $set: { name, CT: Number(CT), MP: Number(MP), Remarks } } // Update all fields
    );
    res.send("OK");
  } catch (err) {
    res.status(500).send("Update failed");
  }
});


app.delete('/delete/:id', async (req, res) => {
  try {
    const collectionName = req.query.collection || "CT";
    await getCollection(collectionName).deleteOne({ _id: new ObjectId(req.params.id) });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send("Error deleting data");
  }
});
///new table


app.post('/submits', async (req, res) => {
  try {
    const collectionName = req.query.collection || "OR";
    const newData = { ...req.body, timestamp: new Date() };
    await getCollection(collectionName).insertOne(newData);
    res.redirect('/remarks.html');
  } catch (err) {
    res.status(500).send("Error inserting data");
  }
});

app.put('/updates/:id', async (req, res) => {
  try {
    const collectionName = req.query.collection || "OR"; // Dynamic collection name
    const { Date,Name, Quality , Safety , Remarks } = req.body; // Input fields
    await getCollection(collectionName).updateOne(
      { _id: new ObjectId(req.params.id) }, // Find by ID
      { $set: { Date, Name, Quality, Safety, Remarks } } // Update all fields
    );
    res.send("OK");
  } catch (err) {
    res.status(500).send("Update failed");
  }
});


app.delete('/deletes/:id', async (req, res) => {
  try {
    const collectionName = req.query.collection || "OR";
    await getCollection(collectionName).deleteOne({ _id: new ObjectId(req.params.id) });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send("Error deleting data");
  }
});
app.get('/datas', async (req, res) => {
  try {
    const collectionName = req.query.collection || "OR";
    const data = await getCollection(collectionName).find({}).toArray();
    res.json(data);
  } catch (err) {
    res.status(500).send("Error fetching data");
  }
});

app.get('/table-data', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const data = await getCollection('OR').findOne({ Date: today });
    if (!data) return res.json([]);
    res.json([data]); // array with single object
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

//////ranges shift wisesummary


app.get('/shift-wise-summary1', async (req, res) => {
  try {
    const { startDate, endDate, line } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "startDate and endDate is required  (YYYY-MM-DD format)"
      });
    }

    // 06:00 day start
    function toDayStart06(dateStr) {
      const dt = new Date(dateStr);
      dt.setHours(6, 0, 0, 0);
      return dt;
    }

    const start = toDayStart06(startDate);
    const end = toDayStart06(endDate);
    end.setDate(end.getDate() + 1);  // make end exclusive 06:00 next day

    // Fetch Data
    const planData = await getCollection("plan")
      .find({
        timestamp: { $gte: start, $lt: end },
        ...(line ? { [LINE_FIELD]: line } : {})
      })
      .sort({ timestamp: 1 })
      .toArray();

    const pmData = await getCollection("pm")
      .find({
        timestamp: { $gte: start, $lt: end },
        ...(line ? { [LINE_FIELD]: line } : {})
      })
      .sort({ timestamp: 1 })
      .toArray();

    function getShiftRange(dateStr, shift) {
      const base = new Date(dateStr);
      base.setHours(0, 0, 0, 0);

      const startA = new Date(base); startA.setHours(6);
      const endA   = new Date(base); endA.setHours(14);

      const startB = new Date(base); startB.setHours(14);
      const endB   = new Date(base); endB.setHours(22);

      const startC = new Date(base); startC.setHours(22);
      const endC   = new Date(base); endC.setDate(endC.getDate() + 1); endC.setHours(6);

      if (shift === "A") return { start: startA, end: endA };
      if (shift === "B") return { start: startB, end: endB };
      return { start: startC, end: endC };
    }

    // Prepare Results
    const result = [];
    const startLoop = new Date(start);

    const totalDays = Math.ceil((end - start) / (24 * 60 * 60 * 1000));

    for (let i = 0; i < totalDays; i++) {
      const day = new Date(startLoop);
      day.setDate(startLoop.getDate() + i);

      const dateStr = day.toISOString().split("T")[0];
      const shifts = ["A", "B", "C"];

      for (const s of shifts) {
        const { start: from, end: to } = getShiftRange(dateStr, s);

        const plan = planData
          .filter(d => d.timestamp >= from && d.timestamp < to)
          .at(-1)?.plan || 0;

        const actual = pmData
          .filter(d => d.timestamp >= from && d.timestamp < to)
          .at(-1)?.count || 0;

        result.push({
          date: dateStr,
          shift: s,
          plan,
          actual,
          or: plan > 0 ? (actual / plan) * 100 : 0
        });
      }
    }

    res.json(result);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




// // Start server
// app.listen(PORT, async () => {
//   await connectToMongoDB();
//   console.log(`🚀 Server running on http://localhost:${PORT}`);

//   // 🎥 AUTO START CAMERA
//   startHourlyRecording();
//   //startLiveHLS();
// });
app.listen(PORT, async () => {
  await connectToMongoDB();
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  startOneMinuteRecording();   // ✅ CORRECT
});
