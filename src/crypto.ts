import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const secretKey = 'f193425d7ea71c67d01b614b1632e9cdcff79802d35ba1ea5771076ca8df0a63';
const iv = 'd928f2ea31a955471f573daf4969affd';

export const encrypt = (text: string) => {
  let cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, 'hex'), Buffer.from(iv, 'hex'));
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

export const decrypt = (encryptedData: string) => {
  let decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, 'hex'), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export const generateUniqueString = (existingList: string) => {
  while (true) {
    // 生成一个8位字符的随机字符串
    const newString = crypto.randomBytes(4).toString('base64').slice(0, 8).replace(/\W/g, 'A');
    // 检查该字符串是否在现有列表中
    if (!existingList.includes(newString)) {
      return newString;
    }
  }
};
