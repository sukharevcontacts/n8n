// ВСТАВЬ СЮДА СВОЮ СТРОКУ (можно из поля/ячейки, но пока — константой)
const text = `в|https://storage.mwsapis.ru/auto-post/%D0%9D%D0%9E%D0%92%D0%9E%D0%A1%D0%98%D0%91%D0%98%D0%A0%D0%A1%D0%9A/%D0%92%D0%B0%D1%80%D0%B2%D1%8F%D0%BD%D1%81%D0%BA%D0%B8%D0%B9%20/102%20%D0%B2%D0%B0%D1%80%D0%B2%D1%8F%D0%BD%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BA%D1%80%D0%BE%D0%BB%D0%B8%D0%BA/2%20otzyv%20lyubi.mp4 ф|https://storage.mwsapis.ru/auto-post/%D0%9D%D0%9E%D0%92%D0%9E%D0%A1%D0%98%D0%91%D0%98%D0%A0%D0%A1%D0%9A/%D0%92%D0%B0%D1%80%D0%B2%D1%8F%D0%BD%D1%81%D0%BA%D0%B8%D0%B9%20/102%20%D0%B2%D0%B0%D1%80%D0%B2%D1%8F%D0%BD%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BA%D1%80%D0%BE%D0%BB%D0%B8%D0%BA/1%20%D1%82%D1%83%D1%88%D0%BA%D0%B0%20%D0%BA%D1%80%D0%BE%D0%BB%D0%B8%D0%BA%D0%B0%20%D1%81%20%D1%86%D0%B5%D0%BD%D0%BE%D0%B9.jpeg в|https://storage.mwsapis.ru/auto-post/%D0%9D%D0%9E%D0%92%D0%9E%D0%A1%D0%98%D0%91%D0%98%D0%A0%D0%A1%D0%9A/%D0%92%D0%B0%D1%80%D0%B2%D1%8F%D0%BD%D1%81%D0%BA%D0%B8%D0%B9%20/102%20%D0%B2%D0%B0%D1%80%D0%B2%D1%8F%D0%BD%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BA%D1%80%D0%BE%D0%BB%D0%B8%D0%BA/3%20%D0%B3%D0%BE%D1%82%D0%BE%D0%B2%D1%8B%D0%B9%20%D0%BA%D1%80%D0%BE%D0%BB%D0%B8%D0%BA.mp4 ф|https://storage.mwsapis.ru/auto-post/%D0%9D%D0%9E%D0%92%D0%9E%D0%A1%D0%98%D0%91%D0%98%D0%A0%D0%A1%D0%9A/%D0%92%D0%B0%D1%80%D0%B2%D1%8F%D0%BD%D1%81%D0%BA%D0%B8%D0%B9%20/102%20%D0%B2%D0%B0%D1%80%D0%B2%D1%8F%D0%BD%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BA%D1%80%D0%BE%D0%BB%D0%B8%D0%BA/4%20%D0%BA%D1%80%D0%BE%D0%BB%D0%B8%D0%BA%20%D0%B2%20%D1%81%D0%BA%D0%BE%D0%B2%D0%BE%D1%80%D0%BE%D0%B4%D0%BA%D0%B5.jpeg`;

const out = [];
const re = /(^|[\s\r\n]+)\+?\s*([вфvf])\|(\S+)/gi;
//проверка1234567
let m;
let idx = 0;
while ((m = re.exec(text)) !== null) {
  const prefix = m[2].toLowerCase();
  const url = m[3];
  const mediaType = (prefix === 'в' || prefix === 'v') ? 'video' : 'image';
  out.push({ json: { idx, mediaType, url } });
  idx++;
}

return out;
