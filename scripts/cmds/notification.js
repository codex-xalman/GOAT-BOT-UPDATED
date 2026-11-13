const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { pipeline } = require("stream/promises");
const moment = require("moment-timezone");

const EXT_BY_TYPE = {
  video: "mp4",
  audio: "mp3",
  photo: "jpg",
  animated_image: "gif",
  sticker: "png"
};

const KNOWN_EXT = /^(mp4|mov|webm|mkv|mp3|m4a|aac|wav|ogg|jpg|jpeg|png|gif|webp)$/;

function getExt(url, type) {
  try {
    const ext = path.extname(new URL(url).pathname).slice(1).toLowerCase();
    if (KNOWN_EXT.test(ext)) return ext;
  } catch { }
  return EXT_BY_TYPE[type] || "bin";
}

async function downloadToTemp(attachment, dir, maxBytes, tracker) {
  const url = attachment.url || attachment.playableUrl || attachment.largePreviewUrl;
  if (!url) throw new Error("Attachment has no downloadable URL.");

  const ext = getExt(url, attachment.type);
  const filePath = path.join(dir, `noti_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`);
  tracker.push(filePath);

  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 120000,
    maxRedirects: 5,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" }
  });

  const tooBig = () => new Error(`File is larger than the ${(maxBytes / 1024 / 1024).toFixed(0)} MB limit.`);

  if (Number(res.headers["content-length"] || 0) > maxBytes) {
    res.data.destroy();
    throw tooBig();
  }

  let size = 0;
  res.data.on("data", chunk => {
    size += chunk.length;
    if (size > maxBytes) res.data.destroy(tooBig());
  });

  await pipeline(res.data, fs.createWriteStream(filePath));

  if (!(await fs.stat(filePath)).size) throw new Error("Downloaded file is empty.");
  return filePath;
}

module.exports = {
  config: {
    name: "notification",
    aliases: ["notify", "noti"],
    version: "4.2",
    author: "xalman",
    countDown: 100,
    role: 2,
    shortDescription: { en: "Premium notification sender" },
    longDescription: { en: "Send text/photo/video notifications to all groups with anti-ban delay." },
    category: "owner",
    guide: { en: "{pn} <message or reply to media>" },
    envConfig: { delayPerGroup: 600, maxFileMB: 25 }
  },

  onStart: async function ({ message, api, event, args, envCommands, threadsData, usersData }) {
    const { delayPerGroup, maxFileMB = 25 } = envCommands.notification;
    const { senderID } = event;

    const senderName = await usersData.getName(senderID) || "Admin";
    const now = moment().tz("Asia/Dhaka");
    const timeString = now.format("hh:mm A");
    const dateString = now.format("DD/MM/YYYY");

    const msgText = args.join(" ") || "";
    const rawAttachments = [
      ...(event.attachments || []),
      ...(event.messageReply?.attachments || [])
    ].filter(item => ["photo", "animated_image", "video", "audio", "sticker"].includes(item.type));

    if (!msgText && rawAttachments.length === 0)
      return message.reply("⚠️ Please provide a message or attach media.");

    const bodyText = `╭━━━━━━━━━━━━━━━━━━━━━━╮
┃    📢 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡                      
╰━━━━━━━━━━━━━━━━━━━━━━╯

👤 𝗔𝗱𝗺𝗶𝗻: ${senderName}
🕒 𝗧𝗶𝗺𝗲: ${timeString} | ${dateString}

📝 𝗠𝗲𝘀𝘀𝗮𝗴𝗲:
───────────────────
${msgText || "(Media Attachment)"}
───────────────────`;

    const botID = api.getCurrentUserID();
    const allThreads = (await threadsData.getAll()).filter(
      t => t.isGroup && t.members.some(m => m.userID == botID && m.inGroup)
    );

    const total = allThreads.length;
    if (total === 0)
      return message.reply("⚠️ No groups found to send notification.");

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const tempFiles = [];

    try {
      for (const attachment of rawAttachments) {
        try {
          await downloadToTemp(attachment, cacheDir, maxFileMB * 1024 * 1024, tempFiles);
        } catch (err) {
          return message.reply(`❌ Media Processing Failed: ${err.message}`);
        }
      }

      let sent = 0, failed = 0, lastError = "";

      await message.reply(`🚀 Sending notification to ${total} groups...`);

      for (const thread of allThreads) {
        try {
          const formSend = { body: bodyText };
          if (tempFiles.length > 0)
            formSend.attachment = tempFiles.map(file => fs.createReadStream(file));

          await api.sendMessage(formSend, thread.threadID);
          sent++;
        } catch (e) {
          failed++;
          lastError = String(e?.error || e?.message || e).slice(0, 150);
          console.error(`Error in ${thread.threadID}:`, e);
        }

        const finalDelay = tempFiles.length > 0 ? 1500 : delayPerGroup;
        await new Promise(res => setTimeout(res, finalDelay));
      }

      const finalReport = `✅ 𝗡𝗼𝘁𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻 𝗖𝗼𝗺𝗽𝗹𝗲𝘁𝗲𝗱!
━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Total: ${total}
🟢 Sent: ${sent}
🔴 Failed: ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━
✨ All groups have been processed.${failed > 0 ? `\n⚠️ Last error: ${lastError}` : ""}`;

      return message.reply(finalReport);
    } finally {
      for (const file of tempFiles)
        await fs.remove(file).catch(() => { });
    }
  }
};
                       
