const html = $json.html;

const buffer = Buffer.from(html, 'utf8');

return [
  {
    binary: {
      data: {
        data: buffer,
        mimeType: 'text/html',
        fileName: 'index.html',
      },
    },
  },
];
