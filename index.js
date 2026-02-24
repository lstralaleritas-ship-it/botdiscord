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

// 🔧 Función de fix: Gemini + reglas locales
async function fixContent(content) {
  let fixed = content;

  try {
    const response = await fetch("https://api.gemini.com/v1/fix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`
      },
      body: JSON.stringify({
        prompt: "Corrige este script de Roblox. Asegúrate de que cada objeto tenga el padre correcto (ScreenGui → PlayerGui → Frame → Label/Button), elimina duplicados de variables, corrige sintaxis rota como end)s(), y devuelve un código limpio y funcional.",
        input: content
      })
    });

    const data = await response.json();
    if (data.output) {
      fixed = data.output;
    }
  } catch (err) {
    console.error("Error al llamar a Gemini:", err);
  }

  // 🧹 Post‑procesamiento local
  fixed = fixed.replace(/(\w+)\.Parent\s*=\s*\1/g, "$1.Parent = frame");
  fixed = fixed.replace(/end\)s\(\)/g, "end");
  fixed = fixed.replace(/Font\.GothamBlack/g, "Enum.Font.GothamBlack");
  fixed = fixed.replace(/Font\.GothamBold/g, "Enum.Font.GothamBold");
  fixed = fixed.replace(/local v\d+\s*=\s*game:GetService\("Workspace"\):GetDescendants\(\)\s*/g, "");

  return fixed;
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

          // 🔧 Fix con Gemini + reglas locales
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
