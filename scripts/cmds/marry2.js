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

const CAPTIONS = [
  "💍 𝗧𝗼𝗱𝗮𝘆, 𝘁𝗼𝗺𝗼𝗿𝗿𝗼𝘄, 𝗮𝗹𝘄𝗮𝘆𝘀 — 𝗶𝘁'𝘀 𝘆𝗼𝘂 𝗮𝗻𝗱 𝗺𝗲.\n💒 𝗧𝗶𝗹𝗹 𝗳𝗼𝗿𝗲𝘃𝗲𝗿 𝗯𝗲𝗴𝗶𝗻𝘀 𝗻𝗼𝘄.",
  "🌹 𝗪𝗶𝗹𝗹 𝘆𝗼𝘂 𝗯𝗲 𝗺𝗶𝗻𝗲, 𝗳𝗼𝗿𝗲𝘃𝗲𝗿?\n💞 𝗜 𝗱𝗼 — 𝗮𝗻𝗱 𝗜 𝗮𝗹𝘄𝗮𝘆𝘀 𝘄𝗶𝗹𝗹.",
  "💐 𝗧𝘄𝗼 𝗵𝗲𝗮𝗿𝘁𝘀, 𝗼𝗻𝗲 𝗽𝗿𝗼𝗺𝗶𝘀𝗲,\n💗 𝗼𝗻𝗲 𝗹𝗶𝗳𝗲𝘁𝗶𝗺𝗲 𝘁𝗼𝗴𝗲𝘁𝗵𝗲𝗿.",
  "🎀 𝗦𝗼𝗺𝗲𝗱𝗮𝘆 𝘄𝗲'𝗹𝗹 𝗹𝗼𝗼𝗸 𝗯𝗮𝗰𝗸 𝗮𝘁 𝘁𝗵𝗶𝘀 𝗮𝗻𝗱 𝘀𝗺𝗶𝗹𝗲.\n💍 𝗧𝗵𝗲 𝗱𝗮𝘆 𝘄𝗲 𝘀𝗮𝗶𝗱 '𝗜 𝗱𝗼'.",
  "🌸 𝗬𝗼𝘂 𝗮𝗿𝗲 𝗺𝘆 𝗯𝗲𝗴𝗶𝗻𝗻𝗶𝗻𝗴, 𝗺𝘆 𝗺𝗶𝗱𝗱𝗹𝗲,\n🫶 𝗮𝗻𝗱 𝗺𝘆 𝗵𝗮𝗽𝗽𝗶𝗹𝘆 𝗲𝘃𝗲𝗿 𝗮𝗳𝘁𝗲𝗿.",
  "💫 𝗜𝗻 𝗮 𝘄𝗼𝗿𝗹𝗱 𝗼𝗳 𝗰𝗵𝗮𝗼𝘀, 𝘆𝗼𝘂 𝗮𝗿𝗲 𝗺𝘆 𝗰𝗮𝗹𝗺.\n💞 𝗜𝗻 𝗮 𝘄𝗼𝗿𝗹𝗱 𝗼𝗳 𝗱𝗼𝘂𝗯𝘁, 𝘆𝗼𝘂 𝗮𝗿𝗲 𝗺𝘆 𝘁𝗿𝘂𝘁𝗵.",
  "👰 𝗬𝗼𝘂 𝗮𝗿𝗲 𝗺𝘆 𝗳𝗮𝘃𝗼𝘂𝗿𝗶𝘁𝗲 𝗽𝗲𝗿𝘀𝗼𝗻 𝘁𝗼 𝗱𝗿𝗲𝗮𝗺 𝗮𝗯𝗼𝘂𝘁,\n🤵 𝗺𝘆 𝗳𝗮𝘃𝗼𝘂𝗿𝗶𝘁𝗲 𝗽𝗲𝗿𝘀𝗼𝗻 𝘁𝗼 𝘄𝗮𝗸𝗲 𝘂𝗽 𝘁𝗼.",
  "💗 𝗜𝗳 𝗹𝗼𝘃𝗲 𝗵𝗮𝗱 𝗮 𝗻𝗮𝗺𝗲, 𝗶𝘁 𝘄𝗼𝘂𝗹𝗱 𝗯𝗲 𝗼𝘂𝗿𝘀.\n💍 𝗜𝗳 𝗳𝗼𝗿𝗲𝘃𝗲𝗿 𝗵𝗮𝗱 𝗮 𝗳𝗮𝗰𝗲, 𝗶𝘁 𝘄𝗼𝘂𝗹𝗱 𝗯𝗲 𝘆𝗼𝘂𝗿𝘀."
];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

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

async function detectGender(uid) {
  try {
    const url = `https://graph.facebook.com/${uid}?fields=gender&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const res = await axios.get(url, { timeout: 10000 });
    const g = res.data?.gender;
    if (g === "male") return "male";
    if (g === "female") return "female";
  } catch (e) { }
  return null;
}

module.exports = {
  config: {
    name: "marry2",
    aliases: ["wedding2", "biye2"],
    version: "1.5",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Wedding canvas - marry couple",
    longDescription: "Auto-detects genders of the two users and places boy on left, girl on right",
    category: "LOVE",
    guide: { en: "{pn} @user | reply | {pn} <uid>" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, mentions, messageReply, senderID } = event;

    let uidA = senderID;
    let uidB = null;

    const mIDs = Object.keys(mentions || {}).filter(id => id !== senderID);
    if (mIDs.length > 0) uidB = mIDs[0];
    else if (messageReply && messageReply.senderID) uidB = messageReply.senderID;
    else {
      const uidArg = args.find(a => /^\d{6,}$/.test(a));
      if (uidArg) uidB = uidArg;
    }

    if (!uidB) {
      return api.sendMessage(
        "⚠️ Please mention, reply to, or provide the UID of the other user.\n" +
        "Example: marry @user  |  reply with marry  |  marry 61596383823942",
        threadID, messageID
      );
    }

    let outPath = null;

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

      const [gA, gB] = await Promise.all([detectGender(uidA), detectGender(uidB)]);

      let boyId, girlId;
      if (gA === "male" && gB === "female") { boyId = uidA; girlId = uidB; }
      else if (gA === "female" && gB === "male") { boyId = uidB; girlId = uidA; }
      else if (gA === "male") { boyId = uidA; girlId = uidB; }
      else if (gB === "male") { boyId = uidB; girlId = uidA; }
      else if (gA === "female") { girlId = uidA; boyId = uidB; }
      else if (gB === "female") { girlId = uidB; boyId = uidA; }
      else { boyId = uidA; girlId = uidB; }

      const base = await getApiBaseUrl();
      const url = `${base}/api/marry?id1=${encodeURIComponent(boyId)}&id2=${encodeURIComponent(girlId)}`;

      const response = await fetchWithRetry(url, 3, 3000);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      outPath = path.join(cacheDir, `marry_${Date.now()}.png`);
      await fs.writeFile(outPath, Buffer.from(response.data));

      api.setMessageReaction("💍", messageID, () => {}, true);

      return api.sendMessage({
        body: pick(CAPTIONS),
        attachment: fs.createReadStream(outPath)
      }, threadID, async () => {
        if (outPath && fs.existsSync(outPath)) await fs.unlink(outPath);
      }, messageID);

    } catch (err) {
      console.error(err);
      if (outPath && fs.existsSync(outPath)) fs.unlinkSync(outPath);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(
        "❌ 𝗦𝗲𝗿𝘃𝗲𝗿 𝗯𝘂𝘀𝘆 𝗼𝗿 𝗿𝗲𝗻𝗱𝗲𝗿 𝗶𝘀 𝘄𝗮𝗸𝗶𝗻𝗴 𝘂𝗽 💤\n" +
        "⏳ Please try again in 20-30 seconds.",
        threadID, messageID
      );
    }
  }
};
