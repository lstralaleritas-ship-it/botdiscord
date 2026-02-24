export function fixContent(content) {
  let fixed = content
    .replace(/\t/g, "    ")
    .replace(/\r/g, "")
    .trim();

  return `-- FIXED BY CYPHERHUB BOT.\n${fixed}`;
}

export function extractLinks(content) {
  const regex = /(https?:\/\/[^\s]+)/g;
  return content.match(regex) || [];
}
