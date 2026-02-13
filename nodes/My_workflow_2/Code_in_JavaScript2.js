const text = `https://storage.mwsapis.ru/auto-post/%D0%9D%D0%9E%D0%92%D0%9E%D0%A1%D0%98%D0%91%D0%98%D0%A0%D0%A1%D0%9A/%D0%A2%D1%80%D0%B5%D1%82%D1%8C%D1%8F%D0%BA%D0%BE%D0%B2%D0%B0%20%D0%BC%D1%8F%D1%81%D0%BE/117%20%D1%85%D0%BE%D0%BB%D0%BE%D0%B4%D0%B5%D1%86/3%20%D1%85%D0%BE%D0%BB%D0%BE%D0%B4%D0%B5%D1%86%20%D0%B2%D0%B1%D0%BB%D0%B8%D0%B7%D0%B8%202.jpg
https://storage.mwsapis.ru/auto-post/%D0%9D%D0%9E%D0%92%D0%9E%D0%A1%D0%98%D0%91%D0%98%D0%A0%D0%A1%D0%9A/%D0%A2%D1%80%D0%B5%D1%82%D1%8C%D1%8F%D0%BA%D0%BE%D0%B2%D0%B0%20%D0%BC%D1%8F%D1%81%D0%BE/117%20%D1%85%D0%BE%D0%BB%D0%BE%D0%B4%D0%B5%D1%86/4%20%D0%BE%D1%82%D0%B7%D1%8B%D0%B2%D1%8B.jpg
https://storage.mwsapis.ru/auto-post/%D0%9D%D0%9E%D0%92%D0%9E%D0%A1%D0%98%D0%91%D0%98%D0%A0%D0%A1%D0%9A/%D0%A2%D1%80%D0%B5%D1%82%D1%8C%D1%8F%D0%BA%D0%BE%D0%B2%D0%B0%20%D0%BC%D1%8F%D1%81%D0%BE/117%20%D1%85%D0%BE%D0%BB%D0%BE%D0%B4%D0%B5%D1%86/5%D0%B2%D0%B8%D0%B4%D0%B5%D0%BE%D1%85%D0%BE%D0%BB%D0%BE%D0%B4%D0%B5%D1%86.mp4`;

const urls = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

function detectType(url) {
  const u = url.toLowerCase();
  if (u.endsWith('.mp4') || u.endsWith('.mov') || u.endsWith('.webm')) return 'video';
  if (u.endsWith('.mp3') || u.endsWith('.wav') || u.endsWith('.ogg')) return 'audio';
  return 'image';
}

return urls.map(url => ({
  json: {
    url,
    uploadType: detectType(url),          // <-- то, что пойдёт в /uploads?type=
    attachmentType: detectType(url),      // <-- то, что пойдёт в attachments[].type
  }
}));
