import axios from 'axios';

export const getImage = (img_url: string, task_id: string, user_id: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 使用axios下载图片
    axios
      .get(img_url, {
        responseType: 'arraybuffer',
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      })
      .then(response => {
        const path = `./tmp/image_${user_id}_${task_id}.jpg`;
        fs.writeFileSync(path, Buffer.from(response.data, 'binary'));
        resolve(path);
      })
      .catch(error => {
        console.error(`[WX] Error downloading image: ${error}`);
        reject();
      });
  });
};
