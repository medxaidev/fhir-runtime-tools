export const fileURLToPath = (url: string | URL) => {
  const urlStr = typeof url === 'string' ? url : url.href;
  return urlStr.replace(/^file:\/\//, '');
};

export const pathToFileURL = (path: string) => {
  return new URL(`file://${path}`);
};

export default {
  fileURLToPath,
  pathToFileURL,
};
