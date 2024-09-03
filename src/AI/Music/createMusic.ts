import axios from 'axios';
import path from 'path';
import { Worker } from 'worker_threads';
import { TextMessage } from '../../types';
import { sendMessage, sendVideo, uploadTemporaryMedia } from '../../util';
import { CreateMusicResponseData } from './types';
import { downloadFile } from './utils';

const BASE_URL = 'https://api.bltcy.ai';
const PATH = '/task/suno/v1/submit/music';
const API_KEY = 'sk-rEI1JL9r2q3rQU4DFd6627A002B047BcA3D24450B63d3381';

const dlFn = async (url: string, outputPath: string, times?: number) => {
  let count = times || 5;

  if (count === 0) throw new Error('下载异常');

  try {
    await downloadFile(url, outputPath);
    console.log(`Downloaded ${url} to ${outputPath}`);
  } catch (error: any) {
    if (error.response.status === 403) {
      count--;
      await new Promise(resolve => setTimeout(resolve, 1000)); // sleep for 5 seconds
      // 重试
      await dlFn(url, outputPath, count);
    }
  }
};

export const createMusic = async (message: TextMessage, res: any) => {
  const { FromUserName: userId, Content: text } = message;

  const gpt_description_prompt = text.replace('创作音乐', '');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
    Accept: 'application/json'
  };

  let response: any;
  try {
    response = await axios.post(BASE_URL + PATH, { gpt_description_prompt }, { headers });

    console.log({ response: response.data });

    if (response?.data.code !== 'success') {
      return null;
    }
  } catch (error: any) {
    console.error(error);
    return;
  }

  await sendMessage(userId, '🚀 歌曲正在创作，预计5分钟后创作完成');

  const taskId = response.data.data;

  // 创建一个新的Worker线程
  const worker = new Worker(path.join(__dirname, './musicThread.ts'));

  // 发送消息给Worker线程
  worker.postMessage({ taskId });

  worker.on('message', async (res: CreateMusicResponseData | null) => {
    try {
      if (!res) {
        console.log('error', res);
        await sendMessage(userId, '创作失败');
        return;
      }

      console.log(res);

      const outputDir = path.join(__dirname, '../../../tmp/music');
      console.log('outputDir: ', outputDir);

      const taskId = res.data[0].task_id;

      const titles: string[] = [];
      const tags: string[] = [];

      for (const [index, v] of res.data[0].data.entries()) {
        const url = v.video_url;
        if (!url) continue;
        try {
          console.log(`Downloading ${url}...`);

          const fileName = path.basename(url);
          const outputPath = path.join(outputDir, fileName);

          await dlFn(url, outputPath);

          // 上传临时文件
          const updateRes = await uploadTemporaryMedia(outputPath, 'video');
          // updateRes.media_id

          await sendVideo(userId, updateRes.media_id, v.title, v.metadata?.tags);
          titles.push(v.title);
          tags.push(v.metadata?.tags ?? '');
        } catch (error: any) {}
      }

      // 🎉 创作完成，这是2首electronic pop风格的音乐，名字是：Sky High，歌曲id1: 26946634139，歌曲id2: 26946634139
    } catch (error) {
      console.log('error');
    }
  });

  worker.on('exit', code => {
    if (code !== 0) {
      console.error(`Worker stopped with exit code ${code}`);
    }
    // 清理资源
    worker.terminate(); // 确保在退出后调用 terminate() 来释放线程资源
  });
};
