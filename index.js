import { Client, GatewayIntentBits, Partials, EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import { TOKEN, MAX_FILE_SIZE } from "./config.js";
import { addToQueue } from "./queue.js";
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

  // 1. Llamada a Gemini
  try {
    const response = await fetch("https://api.gemini.com/v1/fix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`
      },
      body: JSON.stringify({
        prompt: "Corrige este script de Roblox. Usa PlayerGui como parent del ScreenGui, Frame como parent de los elementos UI, elimina duplicados y corrige sintaxis rota.",
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

  // 2. Reglas locales más específicas
  fixed = fixed.replace(/screengui_\w+\.Parent\s*=\s*\w+/g, "screengui_894.Parent = game.Players.LocalPlayer:WaitForChild(\"PlayerGui\")");
  fixed = fixed.replace(/frame_\w+\.Parent\s*=\s*\w+/g, "frame_36.Parent = screengui_894");
  fixed = fixed.replace(/textlabel_\w+\.Parent\s*=\s*\w+/g, "textlabel_42.Parent = frame_36");
  fixed = fixed.replace(/textbutton_\w+\.Parent\s*=\s*\w+/g, "textbutton_291.Parent = frame_36");
  fixed = fixed.replace(/uicorner_\w+\.Parent\s*=\s*\w+/g, "uicorner_835.Parent = frame_36");

  // Corrección de sintaxis rota
  fixed = fixed.replace(/end\)s\(\)/g, "end");

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

          const embed = new EmbedBuilder()
            .setTitle("CypherHub Fix Dumpeds/Skidded")
            .setDescription("**Aquí tu file mi bro.**")
            .setColor(0x3498db)
            .setFooter({ text: "CypherHub © 2026" });

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
