const { parentPort } = require('worker_threads');

const axios = require('axios');

const { MJ_USER_API_KEY } = process.env;

async function pollUserAPITask(taskId, timeout) {
  console.log('=========== pollUserAPITask task_id', taskId);

  let maxRetryTimes = 40;
  const url = `https://api.userapi.ai/midjourney/v2/status?hash=${taskId}`;

  while (maxRetryTimes > 0) {
    await new Promise(resolve => setTimeout(resolve, timeout)); // sleep for 5 seconds

    try {
      const res = await axios.get(url, {
        headers: { 'Content-Type': 'application/json', 'api-key': MJ_USER_API_KEY }
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
parentPort?.on('message', async data => {
  console.info(`[WX] start MJ draw task`);

  const result = await pollUserAPITask(data.task_id, data.timeout ?? 5000);
  parentPort?.postMessage(result ? { ...result, ...data } : null);

  console.info(`[WX] MJ draw task success`);
});
