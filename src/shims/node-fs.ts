export const readFileSync = () => {
  throw new Error('fs is not available in browser');
};

export const readFile = () => {
  throw new Error('fs is not available in browser');
};

export const writeFileSync = () => {
  throw new Error('fs is not available in browser');
};

export const existsSync = () => false;

export const readdirSync = () => [];

export const statSync = () => {
  throw new Error('fs is not available in browser');
};

export default {
  readFileSync,
  readFile,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
};
