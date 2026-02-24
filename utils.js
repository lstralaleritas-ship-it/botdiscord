import fetch from "node-fetch";

// 🔧 Función principal de fix: Gemini + reglas locales
export async function fixContent(content) {
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

  // 2. Reglas locales de limpieza
  fixed = fixed.replace(/(\w+)\.Parent\s*=\s*\1/g, "$1.Parent = frame");
  fixed = fixed.replace(/end\)s\(\)/g, "end");
  fixed = fixed.replace(/Font\.GothamBlack/g, "Enum.Font.GothamBlack");
  fixed = fixed.replace(/Font\.GothamBold/g, "Enum.Font.GothamBold");
  fixed = fixed.replace(/local v\d+\s*=\s*game:GetService\("Workspace"\):GetDescendants\(\)\s*/g, "");

  return fixed;
}

// Extra: detectar links en el contenido
export function extractLinks(content) {
  const regex = /(https?:\/\/[^\s]+)/g;
  return content.match(regex) || [];
}
