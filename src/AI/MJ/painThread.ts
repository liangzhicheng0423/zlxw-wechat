import axios from 'axios';
import { parentPort } from 'worker_threads';
import { getMjConfig } from '../../util';

async function pollUserAPITask(taskId: string, timeout: number) {
  const { UserAPI } = getMjConfig();

  console.log('=========== pollUserAPITask task_id', taskId);

  let maxRetryTimes = 40;
  const url = `https://api.userapi.ai/midjourney/v2/status?hash=${taskId}`;

  while (maxRetryTimes > 0) {
    await new Promise(resolve => setTimeout(resolve, timeout)); // sleep for 5 seconds

    try {
      const res = await axios.get(url, {
        headers: { 'Content-Type': 'application/json', 'api-key': UserAPI.api_key }
      });

      if (res.status === 200) {
        const resJson = res.data;

        console.info(`
            [MJ] task check res sync, task_id=${taskId}, status=${resJson.status}, data=${JSON.stringify(resJson)}}
          `);

        if (resJson.status === 'error') {
          return resJson;
        }

        if ((resJson && resJson.progress === 100) || resJson.status === 'done') {
          // 绘图完成
          return resJson;
        }

        maxRetryTimes -= 1;
      } else {
        console.warn(`[MJ] image check error, status_code=${res.status}, res=${res.data}`);
        maxRetryTimes -= 20;
      }
    } catch (e) {
      console.error(e);
      maxRetryTimes -= 20;
    }
  }

  console.warn('[MJ] end from poll');
}

// 监听主线程发送的消息
parentPort?.on('message', async (data: { task_id: string; user_id: string; timeout: number }) => {
  console.info(`[WX] start MJ draw task`);

  const result = await pollUserAPITask(data.task_id, data.timeout ?? 5000);
  parentPort?.postMessage(result ? { ...result, ...data } : null);

  console.info(`[WX] MJ draw task success`);
});
