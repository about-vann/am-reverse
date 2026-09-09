const fs = require('fs');
const path = require('path');
const os = require('os');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

// Seed file bundled in the project (read-only on serverless)
const bundledDataDir = path.join(__dirname, '..', 'data');
const bundledStatsFile = path.join(bundledDataDir, 'stats.json');

// Writable target: /tmp in serverless environments, or ../data in local/container
const targetDir = isServerless ? os.tmpdir() : bundledDataDir;
const statsFile = path.join(targetDir, 'stats.json');

if (!isServerless && !fs.existsSync(targetDir)) {
  try {
    fs.mkdirSync(targetDir, { recursive: true });
  } catch (e) {
    // Ignore error if directory cannot be created
  }
}

const defaultStats = {
  totalPremium: 0,
  todayPremium: 0,
  lastDate: getTodayDateString()
};

let memoryStats = null;

function getTodayDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function loadStats() {
  const today = getTodayDateString();

  if (memoryStats) {
    if (memoryStats.lastDate !== today) {
      memoryStats.todayPremium = 0;
      memoryStats.lastDate = today;
      saveStats(memoryStats);
    }
    return memoryStats;
  }

  // 1. Try reading from writable location
  try {
    if (fs.existsSync(statsFile)) {
      const raw = fs.readFileSync(statsFile, 'utf8');
      const data = JSON.parse(raw);
      if (data.lastDate !== today) {
        data.todayPremium = 0;
        data.lastDate = today;
        saveStats(data);
      }
      memoryStats = data;
      return data;
    }
  } catch (err) {
    console.warn('Could not read statsFile:', err.message);
  }

  // 2. Fallback to bundled stats if available
  try {
    if (fs.existsSync(bundledStatsFile)) {
      const raw = fs.readFileSync(bundledStatsFile, 'utf8');
      const data = JSON.parse(raw);
      if (data.lastDate !== today) {
        data.todayPremium = 0;
        data.lastDate = today;
      }
      saveStats(data);
      memoryStats = data;
      return data;
    }
  } catch (err) {
    console.warn('Could not read bundledStatsFile:', err.message);
  }

  // 3. Fallback to defaults
  const fresh = { ...defaultStats, lastDate: today };
  saveStats(fresh);
  memoryStats = fresh;
  return memoryStats;
}

function saveStats(statsObj) {
  memoryStats = { ...statsObj };
  try {
    fs.writeFileSync(statsFile, JSON.stringify(statsObj, null, 2), 'utf8');
  } catch (err) {
    // If writing to original target failed (e.g. read-only fs), try /tmp
    if (statsFile !== path.join(os.tmpdir(), 'stats.json')) {
      try {
        fs.writeFileSync(path.join(os.tmpdir(), 'stats.json'), JSON.stringify(statsObj, null, 2), 'utf8');
      } catch (e2) {
        // Fallback in memoryStats already set
      }
    }
  }
}

function getStats() {
  const current = loadStats();
  return {
    total: current.totalPremium || 0,
    today: current.todayPremium || 0
  };
}

function incrementStats() {
  const current = loadStats();
  current.totalPremium = (current.totalPremium || 0) + 1;
  current.todayPremium = (current.todayPremium || 0) + 1;
  current.lastDate = getTodayDateString();
  saveStats(current);
  return {
    total: current.totalPremium,
    today: current.todayPremium
  };
}

module.exports = {
  getStats,
  incrementStats
};
