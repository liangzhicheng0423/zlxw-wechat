const axios = require('axios');
const { parentPort } = require('worker_threads');

const PATH = '/task/suno/v1/fetch';
const BASE_URL = 'https://api.bltcy.ai';
const API_KEY = 'sk-rEI1JL9r2q3rQU4DFd6627A002B047BcA3D24450B63d3381';

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_KEY}`,
  Accept: 'application/json'
};

async function pollUserAPITask(taskId, timeout) {
  console.log('=========== pollUserAPITask task_id', taskId);

  let maxRetryTimes = 100;

  console.log('maxRetryTimes: ', maxRetryTimes);

  const data = { ids: [taskId], action: 'MUSIC' };

  while (maxRetryTimes > 0) {
    await new Promise(resolve => setTimeout(resolve, timeout)); // sleep for 5 seconds

    try {
      const res = await axios.post(BASE_URL + PATH, data, { headers });
      const response = res.data;

      console.log('轮询任务: ', response.data[0].status, response.data[0].progress);

      if (response.data[0].status === 'FAILURE') {
        return null;
      }

      let isComplete = false;
      if (Array.isArray(response.data[0].data)) {
        isComplete = response.data[0].data.every(v => v.status === 'complete');

        console.log(
          '轮询结果: ',
          response.data[0].data.map(v => v.status)
        );
      } else {
        console.log('轮询结果: ', response.data);
        isComplete = response.data?.[0]?.data?.status === 'complete';
      }

      if (response.code !== 'success') {
        console.warn(`[SUNO] music check error, message=${res.data.message}, res=${res.data}`);
        return null;
      }

      if (response.data[0].progress !== '100%' || !isComplete) {
        maxRetryTimes -= 1;
        continue;
      }

      if (response.data[0].progress === '100%' && isComplete) {
        return response;
      }

      console.warn(`[SUNO] music check error, message=${res.message}, res=${res.data}`);
      return null;
    } catch (e) {
      console.error(e);
      maxRetryTimes -= 20;
      return null;
    }
  }
  console.warn('[SUNO] end from poll');
  return null;
}

// 监听主线程发送的消息
parentPort?.on('message', async data => {
  console.log({ data });

  const result = await pollUserAPITask(data.taskId, 5000);
  parentPort?.postMessage(result);

  console.info(`[WX] Music draw task success`);

  process.exit(0); // 可以将 0 改为其他值来测试不同的退出码
});
