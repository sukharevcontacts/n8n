const items = $input.all();

function getUploadType(it) {
  return (it.json.attachmentType || it.json.uploadType || '').toLowerCase();
}

function extractToken(it) {
  // ВИДЕО/АУДИО: токен обычно приходит из /uploads (узел A)
  // после Merge он часто лежит прямо в it.json.token
  if (it.json.token) return it.json.token;

  // КАРТИНКИ: токен часто лежит в it.json.photos (как у тебя было)
  if (it.json.photos) {
    for (const v of Object.values(it.json.photos)) {
      if (v && v.token) return v.token;
    }
  }

  // иногда бывает it.json.payload.token
  if (it.json.payload?.token) return it.json.payload.token;

  return null;
}

const attachments = [];

for (const it of items) {
  const type = getUploadType(it) || 'image';
  const token = extractToken(it);
  if (!token) continue;

  attachments.push({
    type,               // image | video | audio
    payload: { token },
  });
}

return [{
  json: {
    text: "Отчёт за день 📦",
    format: "markdown",
    notify: true,
    attachments,
  }
}];
