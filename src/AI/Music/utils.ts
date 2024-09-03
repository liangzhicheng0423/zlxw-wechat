import axios from 'axios';
import fs from 'fs';

// 下载文件的函数
export const downloadFile = async (url: string, outputPath: string): Promise<string> => {
  const writer = fs.createWriteStream(outputPath);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(outputPath));
    writer.on('error', reject);
  });
};
