import { Client, GatewayIntentBits, Partials, EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import { TOKEN, MAX_FILE_SIZE } from "./config.js";
import { addToQueue } from "./queue.js";
import { extractLinks } from "./utils.js";
import http from "http";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

client.once("ready", () => {
  console.log(`Bot iniciado como ${client.user.tag}`);
});

// 🔧 Nueva función: pedir fix a Gemini
async function fixContent(content) {
  const response = await fetch("https://api.gemini.com/v1/fix", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`
    },
    body: JSON.stringify({
      prompt: "Corrige este código Roblox dumped/skidded: arregla padres mal asignados, elimina duplicados y devuelve un script limpio y funcional.",
      input: content
    })
  });

  const data = await response.json();
  return data.output || content; // si falla, devuelve el original
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith(".D")) {
    if (!message.attachments.size) {
      return message.reply("Adjunta un archivo .txt o .lua.");
    }

    const attachment = message.attachments.first();

    // ✅ Validación estricta: solo .txt o .lua
    if (!attachment.name.endsWith(".txt") && !attachment.name.endsWith(".lua")) {
      return message.reply("Solo se aceptan archivos .txt o .lua.");
    }

    if (attachment.size > MAX_FILE_SIZE) {
      return message.reply("NO PUEDO ARREGLAR ESO POR EL TAMAÑO DEL ARCHIVO");
    }

    addToQueue({
      handler: async () => {
        try {
          const response = await fetch(attachment.url);
          let content = await response.text();

          // 🔧 Aquí se aplica el fix con Gemini
          const fixed = await fixContent(content);
          const links = extractLinks(content);

          const embed = new EmbedBuilder()
            .setTitle("CypherHub Fix Dumpeds/Skidded")
            .setDescription("**Aquí tu file mi bro.**")
            .setColor(0x3498db)
            .setFooter({ text: "CypherHub © 2026" });

          if (links.length > 0) {
            embed.addFields({
              name: "Links encontrados:",
              value: links.join("\n")
            });
          }

          await message.author.send({
            embeds: [embed],
            files: [{ attachment: Buffer.from(fixed, "utf-8"), name: `fixed_${attachment.name}` }]
          });

          await message.reply("Archivo procesado y enviado a tu DM.");
        } catch (err) {
          console.error(err);
          message.reply("Error al procesar el archivo.");
        }
      }
    });
  }
});

client.login(TOKEN);

// Servidor dummy para Railway (mantiene el contenedor vivo)
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("CypherHub bot is running\n");
}).listen(process.env.PORT || 3000);
