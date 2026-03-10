export const join = (...args: string[]) => args.join('/');
export const dirname = (p: string) => {
  const parts = p.split('/');
  parts.pop();
  return parts.join('/') || '/';
};
export const resolve = (...args: string[]) => args.join('/');
export const basename = (p: string) => p.split('/').pop() || '';

export default {
  join,
  dirname,
  resolve,
  basename,
};
