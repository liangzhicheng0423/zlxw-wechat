import axios from 'axios';
import path from 'path';
import { Worker } from 'worker_threads';
import { TextMessage } from '../../types';
import { getReplyBaseInfo, sendMessage } from '../../util';
import taskManager from './taskManager';
import { CmdData, Factory, IconMap, TaskStatus, TaskType, taskNameMapping } from './types';
import { TmtClient, clientConfig, getErrorText, getRequestInterval } from './util';

const { MJ_USER_API_KEY } = process.env;

const chinesePattern = /[\u4e00-\u9fa5]/;

const base_api_url = 'https://api.userapi.ai/midjourney/v2';

/** 处理指令相关的内容 */
const getUserAPIOperation = async (message: TextMessage, res: any, cmd: CmdData) => {
  const baseReply = getReplyBaseInfo(message);

  const userId = message.FromUserName;

  // 适配重绘指令
  const type = cmd.mj_type === TaskType.RESET ? 'reroll' : cmd.mj_type;

  const send = (content: string) => {
    res.send({ ...baseReply, MsgType: 'text', Content: content });
  };

  let response: any;

  try {
    response = await axios.post(
      base_api_url + '/' + type,
      { hash: cmd.img_id, choice: cmd.img_index },
      { headers: { 'Content-Type': 'application/json', 'api-key': MJ_USER_API_KEY } }
    );
  } catch (error) {
    send(getErrorText('由于神秘力量，本次操作失败，请重新尝试'));
    return;
  }

  if (response.status !== 200) {
    send(getErrorText('图片生成失败，请稍后再试'));
    return;
  }

  const taskId = response.data.hash;
  const status = taskManager.addTask(taskId, userId, '', cmd.mj_type);

  if (status.status === 'error') {
    send(status.message);
    return;
  }

  const workerPath = path.join(__dirname, `./painThread.js`);
  // 创建一个新的Worker线程
  const worker = new Worker(workerPath);

  // 发送消息给Worker线程
  worker.postMessage({ task_id: taskId, user_id: userId, type: Factory.UserAPI, timeout: 3000 });

  worker.on('message', async res => {
    try {
      console.info('[MJ UserAPI] Operate Received message from Worker:', res);

      if (res == null) {
        await sendMessage(userId, getErrorText('由于神秘力量，本次操作失败，请重新尝试'));
        taskManager.updateTask(userId, taskId, '', '', TaskStatus.ABORTED);
        return;
      }

      try {
        await axios.post(
          'http://api.ai-xiaowu.com:3000/download',
          { originUrl: res.result.url, taskId, userId, type: 'operate' },
          { headers: { 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.log('发送下载任务失败');
      }
    } catch (error) {
      console.error('[useAPI] worker message response error: ' + error);
      taskManager.updateTask(userId, taskId, '', '', TaskStatus.ABORTED);
    }
  });

  const content = `${IconMap[cmd.mj_type]} 图片正在${taskNameMapping[cmd.mj_type]}中，请耐心等待`;
  send(content);
};

export const getUserAPIGenerate = async (message: TextMessage, res: any, cmd?: CmdData) => {
  if (!!cmd) {
    await getUserAPIOperation(message, res, cmd);
    return;
  }

  const baseReply = getReplyBaseInfo(message);

  const send = (content: string) => {
    res.send({ ...baseReply, MsgType: 'text', Content: content });
  };

  const prompt = message.Content;

  let real_prompt = '';

  // 实例化要请求产品的client对象,clientProfile是可选的
  if (chinesePattern.test(prompt)) {
    const client = new TmtClient(clientConfig);
    const params = { SourceText: prompt, Source: 'auto', Target: 'en', ProjectId: 0 };
    client.TextTranslate(params).then(
      (data: any) => {
        real_prompt = data.TargetText ?? '';
      },
      (err: any) => {
        console.error('error', err);
      }
    );
  }

  console.log('翻译prompt');

  const user_id = message.FromUserName;

  let response: any;
  try {
    response = await axios.post(
      base_api_url + '/imagine',
      { prompt: real_prompt || prompt },
      { headers: { 'Content-Type': 'application/json', 'api-key': MJ_USER_API_KEY } }
    );
  } catch (error: any) {
    send(`图片生成失败，请检查参数\n错误原因：${error.response.data.error}`);
  }

  if (response.status !== 200) {
    send(getErrorText('图片生成失败，请稍后再试'));
    return;
  }

  const task_id = response.data.hash as string;

  const status = taskManager.addTask(task_id, user_id, prompt, TaskType.GENERATE);

  console.log('新增用户任务: ', status.status);

  if (status.status === 'error') {
    send(status.message);
    return;
  }

  // 创建一个新的Worker线程
  const workerPath = path.join(__dirname, `./painThread.js`);
  console.log('创建轮询线程: ', workerPath);
  const worker = new Worker(workerPath);

  // 发送消息给Worker线程
  const count = taskManager.getTaskCount(user_id);
  console.log('用户当天任务量: ', count);

  // 每日超出fast_count， 将轮询时间降为2分钟
  const timeout = getRequestInterval(count);
  console.log('轮询间隔: ', timeout);

  console.log('发送消息给Worker线程', { task_id, user_id, timeout });
  worker.postMessage({ task_id, user_id, timeout });

  worker.on('message', async res => {
    try {
      console.info('[info] UserAPI: Worker 返回结果: ', res);

      if (res === null) {
        await sendMessage(user_id, `[ERROR]\n由于神秘力量，本次操作失败，请重新尝试\n`);
        if (task_id !== undefined) {
          taskManager.updateTask(user_id, task_id, undefined, undefined, TaskStatus.ABORTED);
        }
        return;
      }

      if (res.status === 'error') {
        await sendMessage(user_id, `[ERROR]\n由于神秘力量，本次操作失败，请重新尝试\n${res.status_reason}`);
        if (task_id !== undefined) {
          taskManager.updateTask(user_id, task_id, '', '', TaskStatus.ABORTED);
        }

        return;
      }
    } catch (error) {
      taskManager.updateTask(user_id, task_id, '', '', TaskStatus.ABORTED);
      await sendMessage(user_id, `[ERROR]\n由于神秘力量，本次操作失败，请重新尝试`);
    }

    const { user_id: userId, task_id: taskId, result, hash } = res;

    const task = taskManager.getTask(taskId, userId);
    console.log('获取当前轮询任务: ', task);

    try {
      const jumpRes = await axios.post(
        'http://api.ai-xiaowu.com:3000/download',
        { originUrl: result.url, taskId, userId, type: 'generate' },
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log('代理下载完成: ', jumpRes.data);
    } catch (error) {
      console.log('发送下载任务失败');
    }
  });

  let content = '🚀 您的作品将在1分钟左右完成，请耐心等待\n- - - - - - - - -\n';

  if (real_prompt) content += `初始prompt: ${prompt}\n转换后prompt: ${real_prompt}`;
  else content += `prompt: ${prompt}`;

  send(content);
};
