// Restore context after A1

const prev = $items('MAX code after switch1'); // имя ноды ДО A1
const current = $input.all();

return current.map((item, i) => {
  const ctx = prev[i]?.json ?? {};

  return {
    json: {
      ...ctx,        // магазин, chat_id, idx, text
      ...item.json   // url/token от A1
    }
  };
});
