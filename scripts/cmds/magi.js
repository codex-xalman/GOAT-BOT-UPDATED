const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_CONFIG_URL = "https://raw.githubusercontent.com/codex-xalman/xalmanx210/refs/heads/main/apis.json";
const API_KEY = "xalman-canvas";
let apiBaseUrl = null;
let apiConfigRequest = null;

async function getApiBaseUrl() {
  if (apiBaseUrl) return apiBaseUrl;

  if (!apiConfigRequest) {
    apiConfigRequest = axios
      .get(API_CONFIG_URL, { timeout: 15000 })
      .then(({ data }) => {
        const baseUrl = data?.[API_KEY];

        if (typeof baseUrl !== "string" || !baseUrl.trim()) {
          throw new Error(`Missing API key in apis.json: ${API_KEY}`);
        }

        apiBaseUrl = baseUrl.replace(/\/+$/, "");
        return apiBaseUrl;
      })
      .finally(() => {
        apiConfigRequest = null;
      });
  }

  return apiConfigRequest;
}

async function fetchWithRetry(url, retries = 3, delay = 3000) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 90000,
        validateStatus: () => true,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const ct = res.headers["content-type"] || "";
      if (ct.includes("image")) return res;
      lastErr = new Error("Server returned non-image response");
    } catch (e) {
      lastErr = e;
    }
    if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
  }
  throw lastErr || new Error("Request failed");
}

module.exports = {
  config: {
    name: "magi",
    version: "1.5",
    author: "xalman",
    countDown: 5,
    role: 3,
    shortDescription: "Magi canvas canvas using target UID pfp",
    longDescription: "Generates an image with the target's pfp as a magi canvas",
    category: "NSFW",
    guide: { en: "{pn} @user | reply | {pn} <uid>" }
  },

  onStart: async function ({ api, event, args, usersData }) {
    const { threadID, messageID, mentions, messageReply, senderID } = event;

    let targetId = null;

    const mIDs = Object.keys(mentions || {}).filter(id => id !== senderID);
    if (mIDs.length > 0) targetId = mIDs[0];
    else if (messageReply && messageReply.senderID) targetId = messageReply.senderID;
    else {
      const uidArg = args.find(a => /^\d{6,}$/.test(a));
      if (uidArg) targetId = uidArg;
    }

    if (!targetId) {
      return api.sendMessage(
        "⚠️ Please mention, reply to, or provide the UID of the target user.\n" +
        "Example: magi @user  |  reply with magi  |  magi 575488634",
        threadID, messageID
      );
    }

    let outPath = null;

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

      const targetName = await usersData.getName(targetId);

      let base = "https://xalman-canvas-apis.onrender.com";
      try {
        const configBase = await getApiBaseUrl();
        if (configBase) base = configBase;
      } catch (e) { }

      const url = `${base}/api/magi?tergetuid=${encodeURIComponent(targetId)}`;

      const response = await fetchWithRetry(url, 3, 3000);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      outPath = path.join(cacheDir, `magi_${Date.now()}.png`);
      await fs.writeFile(outPath, Buffer.from(response.data));

      api.setMessageReaction("🥵", messageID, () => {}, true);

      return api.sendMessage({
        body: `🪄 MAGIC WITHOUT C 🥵⚡${targetName}`,
        mentions: [{ tag: targetName, id: targetId }],
        attachment: fs.createReadStream(outPath)
      }, threadID, async () => {
        if (outPath && fs.existsSync(outPath)) await fs.unlink(outPath);
      }, messageID);

    } catch (err) {
      console.error(err);
      if (outPath && fs.existsSync(outPath)) await fs.unlink(outPath);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(
        "❌ 𝗦𝗲𝗿𝘃𝗲𝗿 𝗯𝘂𝘀𝘆 𝗼𝗿 𝗿𝗲𝗻𝗱𝗲𝗿 𝗶𝘀 𝘄𝗮𝗸𝗶𝗻𝗴 𝘂𝗽 💤\n" +
        "⏳ Please try again in 20-30 seconds.",
        threadID, messageID
      );
    }
  }
};
