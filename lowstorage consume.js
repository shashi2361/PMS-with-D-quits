const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");

ffmpeg.setFfmpegPath(ffmpegPath);

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
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}

function getCollection(name) {
  return db.collection(name);
}

// ========================================
// 🎥 OPTIMIZED CAMERA CONFIGURATION
// ========================================
const CAMERAS = {
  cam1: {
    rtsp: "rtsp://admin:Password%401@192.168.250.210:554/stream2", // ⚠️ USE stream2
    videoDir: path.join(__dirname, "videos", "cam1"),
    hlsDir: path.join(__dirname, "public", "hls", "cam1")
  },
  cam2: {
    rtsp: "rtsp://admin:Password%401@192.168.250.215:554/stream2",
    videoDir: path.join(__dirname, "videos", "cam2"),
    hlsDir: path.join(__dirname, "public", "hls", "cam2")
  },
  cam3: {
    rtsp: "rtsp://admin:Password%401@192.168.250.216:554/stream2",
    videoDir: path.join(__dirname, "videos", "cam3"),
    hlsDir: path.join(__dirname, "public", "hls", "cam3")
  },
  cam4: {
    rtsp: "rtsp://admin:Password%401@192.168.250.217:554/stream2",
    videoDir: path.join(__dirname, "videos", "cam4"),
    hlsDir: path.join(__dirname, "public", "hls", "cam4")
  }
};

// Create directories
Object.values(CAMERAS).forEach(cam => {
  if (!fs.existsSync(cam.videoDir)) fs.mkdirSync(cam.videoDir, { recursive: true });
  if (!fs.existsSync(cam.hlsDir)) fs.mkdirSync(cam.hlsDir, { recursive: true });
});

const recordingProcesses = {};
const recordingStats = {};

// ========================================
// 🎥 OPTIMIZED RECORDING FUNCTION
// ========================================
function startOptimizedRecording(cameraId) {
  const cam = CAMERAS[cameraId];
  if (!cam) return;

  if (recordingProcesses[cameraId]) {
    console.log(`⏱ ${cameraId} already recording`);
    return;
  }

  recordingStats[cameraId] = {
    startTime: new Date(),
    lastFrameTime: new Date(),
    restartCount: 0,
    errors: []
  };

  const outputPattern = path.join(
    cam.videoDir,
    `${cameraId}_%Y-%m-%d_%H-%M.mp4`
  );

  console.log(`🎥 Starting ${cameraId} with OPTIMIZED settings`);

  recordingProcesses[cameraId] = ffmpeg(cam.rtsp)
    .inputOptions([
      '-rtsp_transport', 'tcp',
      '-timeout', '5000000',
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '2'
    ])
    .videoCodec('libx264')
    .outputOptions([
      '-preset', 'veryfast',
      '-crf', '28',
      '-maxrate', '1M',
      '-bufsize', '2M',
      '-g', '50',
      '-sc_threshold', '0',
      '-f', 'segment',
      '-segment_time', '300',
      '-segment_format', 'mp4',
      '-reset_timestamps', '1',
      '-strftime', '1',
      '-movflags', '+faststart'
    ])
    .output(outputPattern)
    .on('start', (cmd) => {
      console.log(`✅ ${cameraId} started`);
    })
    .on('progress', (progress) => {
      recordingStats[cameraId].lastFrameTime = new Date();
    })
    .on('error', (err) => {
      console.error(`❌ ${cameraId} error: ${err.message}`);
      recordingStats[cameraId].errors.push({
        time: new Date(),
        error: err.message
      });
      
      recordingProcesses[cameraId] = null;
      
      setTimeout(() => {
        console.log(`🔄 Restarting ${cameraId}...`);
        recordingStats[cameraId].restartCount++;
        startOptimizedRecording(cameraId);
      }, 5000);
    })
    .on('end', () => {
      console.log(`⏹️ ${cameraId} ended`);
      recordingProcesses[cameraId] = null;
    });

  recordingProcesses[cameraId].run();
}

// ========================================
// 🔍 OPTIMIZED VIDEO RETRIEVAL
// ========================================
app.get("/api/camera/video", (req, res) => {
  const { cameraId, ts } = req.query;
  
  if (!cameraId || !ts) {
    return res.status(400).send("cameraId & timestamp required");
  }

  const cam = CAMERAS[cameraId];
  if (!cam) {
    return res.status(404).send("Invalid camera");
  }

  const clickTime = new Date(ts);
  
  // Find NEAREST video file (within ±10 minutes)
  const files = fs.readdirSync(cam.videoDir)
    .filter(f => f.startsWith(cameraId) && f.endsWith('.mp4'))
    .map(f => {
      const match = f.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})/);
      if (!match) return null;
      
      const fileTime = new Date(
        parseInt(match[1]), 
        parseInt(match[2]) - 1, 
        parseInt(match[3]),
        parseInt(match[4]), 
        parseInt(match[5])
      );
      
      return {
        name: f,
        time: fileTime,
        diff: Math.abs(fileTime - clickTime)
      };
    })
    .filter(f => f !== null && f.diff < 10 * 60 * 1000)
    .sort((a, b) => a.diff - b.diff);

  if (files.length === 0) {
    return res.status(404).send("No video found near this time");
  }

  const videoPath = path.join(cam.videoDir, files[0].name);
  console.log(`📹 Serving ${cameraId}: ${files[0].name}`);
  res.sendFile(videoPath);
});

// ========================================
// 📊 CAMERA HEALTH API
// ========================================
app.get("/api/camera/health", (req, res) => {
  const health = {};
  
  Object.keys(CAMERAS).forEach(camId => {
    const stats = recordingStats[camId];
    if (!stats) {
      health[camId] = { status: "NOT_STARTED" };
      return;
    }
    
    const timeSinceLastFrame = Date.now() - stats.lastFrameTime;
    const isAlive = timeSinceLastFrame < 60000;
    
    health[camId] = {
      status: isAlive ? "RECORDING" : "STALLED",
      uptime: Math.round((Date.now() - stats.startTime) / 1000),
      restarts: stats.restartCount,
      lastFrame: Math.round(timeSinceLastFrame / 1000) + "s ago",
      recentErrors: stats.errors.slice(-3)
    };
  });
  
  res.json(health);
});

// ========================================
// 📈 STORAGE USAGE API
// ========================================
app.get("/api/storage/usage", (req, res) => {
  const usage = {};
  let totalSize = 0;
  
  Object.entries(CAMERAS).forEach(([camId, cam]) => {
    try {
      const files = fs.readdirSync(cam.videoDir);
      let cameraSize = 0;
      
      files.forEach(file => {
        const stats = fs.statSync(path.join(cam.videoDir, file));
        cameraSize += stats.size;
      });
      
      usage[camId] = {
        files: files.length,
        sizeGB: (cameraSize / 1024 / 1024 / 1024).toFixed(2)
      };
      
      totalSize += cameraSize;
    } catch (err) {
      usage[camId] = { error: err.message };
    }
  });
  
  usage.total = {
    sizeGB: (totalSize / 1024 / 1024 / 1024).toFixed(2),
    estimatedDays: totalSize > 0 ? Math.round((1024 * 1024 * 1024 * 1024) / totalSize) : "N/A"
  };
  
  res.json(usage);
});

// ========================================
// 🗑️ CLEANUP (30 DAYS RETENTION)
// ========================================
function cleanupOldVideos() {
  console.log("🗑️ Running cleanup...");
  
  Object.values(CAMERAS).forEach(cam => {
    try {
      const files = fs.readdirSync(cam.videoDir);
      const now = Date.now();
      const retentionMs = 30 * 24 * 60 * 60 * 1000;
      
      let deletedCount = 0;
      let freedSpace = 0;
      
      files.forEach(file => {
        const filePath = path.join(cam.videoDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;
        
        if (age > retentionMs) {
          freedSpace += stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });
      
      if (deletedCount > 0) {
        console.log(`✅ Deleted ${deletedCount} files, freed ${(freedSpace / 1024 / 1024 / 1024).toFixed(2)} GB`);
      }
    } catch (err) {
      console.error(`❌ Cleanup error:`, err);
    }
  });
}

setInterval(cleanupOldVideos, 6 * 60 * 60 * 1000);

// ========================================
// 📊 ALL YOUR EXISTING APIs
// ========================================

// Graph Data (with machine filter)
app.get('/graphdatax', async (req, res) => {
  try {
    const { machine, from, to, date } = req.query;
    const now = new Date();

    function getCurrentShiftStart(now) {
      const hour = now.getHours();
      const shiftStart = new Date(now);

      if (hour >= 6 && hour < 14) shiftStart.setHours(6,0,0,0);
      else if (hour >= 14 && hour < 22) shiftStart.setHours(14,0,0,0);
      else {
        if (hour < 6) shiftStart.setDate(shiftStart.getDate() - 1);
        shiftStart.setHours(22,0,0,0);
      }
      return shiftStart;
    }

    let startTime, endTime;

    if (date) {
      startTime = new Date(date);
      startTime.setHours(0, 0, 0, 0);
      endTime = new Date(date);
      endTime.setHours(23, 59, 59, 999);
    } else if (from && to) {
      startTime = new Date(from);
      startTime.setHours(0,0,0,0);
      endTime = new Date(to);
      endTime.setHours(23,59,59,999);
    } else {
      const cur = getCurrentShiftStart(now);
      startTime = new Date(cur.getTime() - 16 * 60 * 60 * 1000);
      endTime = new Date(cur.getTime() + 8 * 60 * 60 * 1000);
    }

    const baseQuery = {
      timestamp: { $gte: startTime, $lt: endTime },
      second: { $exists: true },
      second2: { $exists: true }
    };

    if (machine) {
      baseQuery.machineName = machine;
    }

    const collection = getCollection("pm");

    if (machine) {
      const data = await collection
        .find(baseQuery)
        .sort({ timestamp: 1 })
        .toArray();

      return res.json({
        mode: "DATE_24_HOUR",
        machines: [machine],
        from: startTime,
        to: endTime,
        dataByMachine: {
          [machine]: data
        }
      });
    }

    const machines = await collection.distinct("machineName");
    const allData = await collection
      .find(baseQuery)
      .sort({ timestamp: 1 })
      .toArray();

    const dataByMachine = {};
    machines.forEach(m => dataByMachine[m] = []);

    allData.forEach(row => {
      if (row.machineName) {
        dataByMachine[row.machineName].push(row);
      }
    });

    res.json({
      mode: date ? "DATE_24_HOUR" : "SHIFT",
      machines,
      from: startTime,
      to: endTime,
      dataByMachine
    });

  } catch (err) {
    console.error("Error in /graphdatax:", err);
    res.status(500).send("Error fetching graph data");
  }
});

// Graph Data (last two shifts)
app.get('/graphdata', async (req, res) => {
  try {
    const now = new Date();

    function getCurrentShiftStart(now) {
      const hour = now.getHours();
      const shiftStart = new Date(now);

      if (hour >= 6 && hour < 14) {
        shiftStart.setHours(6, 0, 0, 0);
      } else if (hour >= 14 && hour < 22) {
        shiftStart.setHours(14, 0, 0, 0);
      } else {
        if (hour >= 22) {
          shiftStart.setHours(22, 0, 0, 0);
        } else {
          shiftStart.setDate(shiftStart.getDate() - 1);
          shiftStart.setHours(22, 0, 0, 0);
        }
      }
      return shiftStart;
    }

    const currentShiftStart = getCurrentShiftStart(now);
    const prevShiftStart = new Date(currentShiftStart.getTime() - 8 * 60 * 60 * 1000);
    const prevPrevShiftStart = new Date(prevShiftStart.getTime() - 8 * 60 * 60 * 1000);
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

// Daily Image
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.get('/api/daily-image', (req, res) => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const imageName = `${day}.jpg`;
  const imageUrl = `/images/${imageName}`;
  res.json({ imageUrl });
});

// Merged CT and PM data
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

// Plan vs Actual
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

// CT Range
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

    const collection = getCollection("pm");
    const data = await collection.find({
      timestamp: { $gte: shiftStart, $lt: shiftEnd },
      second: { $exists: true }
    }).sort({ timestamp: 1 }).toArray();

    if (data.length === 0) {
      return res.json({ min: null, max: null, actual: null });
    }

    const values = data.map(d => d.second);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const actual = data[data.length - 1].second;

    res.json({ min, max, actual });

  } catch (err) {
    console.error("❌ Error in /ct-range:", err);
    res.status(500).send("Error calculating CT range");
  }
});

// CT Ranges (3 shifts avg)
app.get('/ct-ranges', async (req, res) => {
  try {
    const now = new Date();

    function getShiftBoundaries(date) {
      let start = new Date(date);
      let end = new Date(date);
      let name = '';

      const hour = date.getHours();

      if (hour >= 6 && hour < 14) {
        start.setHours(6, 0, 0, 0);
        end.setHours(14, 0, 0, 0);
        name = 'A Shift';
      } else if (hour >= 14 && hour < 22) {
        start.setHours(14, 0, 0, 0);
        end.setHours(22, 0, 0, 0);
        name = 'B Shift';
      } else {
        if (hour < 6) start.setDate(start.getDate() - 1);
        start.setHours(22, 0, 0, 0);
        end = new Date(start);
        end.setHours(6 + 24, 0, 0, 0);
        name = 'C Shift';
      }
      return { start, end, name };
    }

    const currentShift = getShiftBoundaries(now);

    function getPreviousShift(shift) {
      let prevDate = new Date(shift.start);
      prevDate.setHours(prevDate.getHours() - 1);
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

// Today OR
app.get('/today-or', async (req, res) => {
  try {
    const now = new Date();

    const shiftAStart = new Date();
    shiftAStart.setHours(6, 0, 0, 0);
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

// Weekly OR
app.get('/weekly-or', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(6, 0, 0, 0);

    const resultORs = [];

    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);

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

// Hourly Summary
app.get('/hourly-summary', async (req, res) => {
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
        const livePlanDoc = planData.filter(d => d.timestamp >= from && d.timestamp < to).at(-1);
        const prevPlanDoc = planData.filter(d => d.timestamp < from).at(-1);
        hourPlan = Math.max((livePlanDoc?.plan || 0) - (prevPlanDoc?.plan || 0), 0);

        const liveActualDoc = pmData.filter(d => d.timestamp >= from && d.timestamp < to).at(-1);
        const prevActualDoc = pmData.filter(d => d.timestamp < from).at(-1);
        hourActual = Math.max((liveActualDoc?.count || 0) - (prevActualDoc?.count || 0), 0);
      } else {
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

// Daily Summary (7 days, 168 hours)
app.get('/daily-summary', async (req, res) => {
  try {
    const now = new Date();

    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(6, 0, 0, 0);

    const end = new Date(now);
    if (now.getHours() < 6) {
      end.setDate(end.getDate());
    } else {
      end.setDate(end.getDate() + 1);
    }
    end.setHours(6, 0, 0, 0);

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
        }),
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

// CT Frequency (monthly)
app.get('/ct-frequency', async (req, res) => {
  try {
    const collection = getCollection("pm");
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

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

// Shift-wise Summary (7 days)
app.get('/shift-wise-summary', async (req, res) => {
  try {
    const now = new Date();

    const start = new Date();
    start.setDate(now.getDate() - 6);
    start.setHours(6, 0, 0, 0);

    const end = new Date(now);
    if (now.getHours() < 6) {
      end.setDate(end.getDate());
    } else {
      end.setDate(end.getDate() + 1);
    }
    end.setHours(6, 0, 0, 0);

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

// Shift-wise Summary 2 (monthly cumulative)
app.get('/shift-wise-summary2', async (req, res) => {
  try {
    const now = new Date();

    const start = new Date(now.getFullYear(), now.getMonth(), 1, 6, 0, 0);
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

// CT-MP Data
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

// Current Hour Summary
app.get('/current-hour-summary', async (req, res) => {
  try {
    const now = new Date();
    const currentHourStart = new Date(now.setMinutes(0, 0, 0));
    const currentHourEnd = new Date(currentHourStart);
    currentHourEnd.setHours(currentHourEnd.getHours() + 1);

    const lastHourStart = new Date(currentHourStart);
    lastHourStart.setHours(lastHourStart.getHours() - 1);

    const currentPlanDoc = await getCollection("plan")
      .find({ timestamp: { $gte: currentHourStart, $lt: currentHourEnd } })
      .sort({ timestamp: -1 }).limit(1).toArray();

    const currentPMDoc = await getCollection("pm")
      .find({ timestamp: { $gte: currentHourStart, $lt: currentHourEnd } })
      .sort({ timestamp: -1 }).limit(1).toArray();

    const prevPlanDoc = await getCollection("plan")
      .find({ timestamp: { $gte: lastHourStart, $lt: currentHourStart } })
      .sort({ timestamp: -1 }).limit(1).toArray();

    const prevPMDoc = await getCollection("pm")
      .find({ timestamp: { $gte: lastHourStart, $lt: currentHourStart } })
      .sort({ timestamp: -1 }).limit(1).toArray();

    const currentPlan = currentPlanDoc[0]?.plan || 0;
    const prevPlan = prevPlanDoc[0]?.plan || 0;
    const plan = Math.max(currentPlan - prevPlan, 0);

    const currentCount = currentPMDoc[0]?.count || 0;
    const prevCount = prevPMDoc[0]?.count || 0;
    const actual = Math.max(currentCount - prevCount, 0);

    const or = plan > 0 ? ((actual / plan) * 100).toFixed(2) : "0.00";

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

// OR Distribution
app.get('/or-distribution', async (req, res) => {
  try {
    const now = new Date();
    let shiftStart = new Date();

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
      orPercentages.push(Math.min(Math.max(or, 0), 100));
    }

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

// Generic CRUD APIs
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
    const collectionName = req.query.collection || "CT";
    const { name, CT, MP, Remarks } = req.body;
    await getCollection(collectionName).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, CT: Number(CT), MP: Number(MP), Remarks } }
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

// OR Collection APIs
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
    const collectionName = req.query.collection || "OR";
    const { Date, Name, Quality, Safety, Remarks } = req.body;
    await getCollection(collectionName).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { Date, Name, Quality, Safety, Remarks } }
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
    const today = new Date().toISOString().split('T')[0];
    const data = await getCollection('OR').findOne({ Date: today });
    if (!data) return res.json([]);
    res.json([data]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Shift-wise Summary with Date Range
app.get('/shift-wise-summary1', async (req, res) => {
  try {
    const { startDate, endDate, line } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "startDate and endDate required (YYYY-MM-DD format)"
      });
    }

    function toDayStart06(dateStr) {
      const dt = new Date(dateStr);
      dt.setHours(6, 0, 0, 0);
      return dt;
    }

    const start = toDayStart06(startDate);
    const end = toDayStart06(endDate);
    end.setDate(end.getDate() + 1);

    const planData = await getCollection("plan")
      .find({
        timestamp: { $gte: start, $lt: end }
      })
      .sort({ timestamp: 1 })
      .toArray();

    const pmData = await getCollection("pm")
      .find({
        timestamp: { $gte: start, $lt: end }
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

// ========================================
// 🚀 START SERVER
// ========================================
app.listen(PORT, async () => {
  await connectToMongoDB();
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  
  // Start all cameras with optimized settings
  Object.keys(CAMERAS).forEach(camId => {
    startOptimizedRecording(camId);
  });
  
  // Initial cleanup after 10 seconds
  setTimeout(cleanupOldVideos, 10000);
  
  console.log(`
✅ OPTIMIZATION APPLIED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📹 STORAGE: ~40-50GB/day (vs 1TB before)
🎯 SEGMENTS: 5-minute files (better seeking)
🔄 AUTO-RECONNECT: Network failures handled
⚡ BITRATE: 1 Mbps per camera
🗑️ RETENTION: 30 days automatic cleanup

📊 MONITORING APIs:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /api/camera/health        - Recording status
GET /api/storage/usage         - Disk usage stats
GET /api/camera/video?cameraId=cam1&ts=2026-01-04T10:30:00Z

⚠️  IMPORTANT: Change camera URLs to stream2 in CAMERAS config!
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down...');
  Object.values(recordingProcesses).forEach(proc => {
    if (proc) proc.kill('SIGTERM');
  });
  process.exit(0);
});
