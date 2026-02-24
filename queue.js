let queue = [];
let processing = false;

export function addToQueue(item) {
  queue.push(item);
  processQueue();
}

async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;

  const { handler } = queue.shift();
  await handler();

  processing = false;
  if (queue.length > 0) processQueue();
}
