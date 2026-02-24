// utils.js
export function fixContent(content) {
  let fixed = content;

  // 🔧 1. Corregir padres mal asignados (obj.Parent = obj → obj.Parent = contenedor)
  fixed = fixed.replace(/(\w+)\.Parent\s*=\s*\1/g, "$1.Parent = frame");

  // 🔧 2. Eliminar cierres rotos como "end)s()"
  fixed = fixed.replace(/end\)s\(\)/g, "end");

  // 🔧 3. Quitar duplicados de variables v8, v9, etc. (simplificación básica)
  fixed = fixed.replace(/local v\d+\s*=\s*game:GetService\("Workspace"\):GetDescendants\(\)\s*/g, "");

  // 🔧 4. Normalizar fonts y enums (ejemplo)
  fixed = fixed.replace(/Font\.GothamBlack/g, "Enum.Font.GothamBlack");
  fixed = fixed.replace(/Font\.GothamBold/g, "Enum.Font.GothamBold");

  // 🔧 5. Asegurar que ScreenGui se parenta a PlayerGui
  fixed = fixed.replace(/(\w+)\.Parent\s*=\s*\1/g, "$1.Parent = game.Players.LocalPlayer:WaitForChild(\"PlayerGui\")");

  return fixed;
}

// Extra: detectar links en el contenido
export function extractLinks(content) {
  const regex = /(https?:\/\/[^\s]+)/g;
  return content.match(regex) || [];
}
