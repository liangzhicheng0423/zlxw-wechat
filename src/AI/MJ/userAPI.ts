import { translate } from '@vitalets/google-translate-api';
import axios from 'axios';
import COS from 'cos-nodejs-sdk-v5';
import path from 'path';
import { Worker } from 'worker_threads';
import { TextMessage } from '../../types';
import { getMjConfig, getReplyBaseInfo, sendImage, sendMessage, uploadTemporaryMedia } from '../../util';
import taskManager from './taskManager';
import { CmdData, Factory, IconMap, TaskStatus, TaskType, taskNameMapping } from './types';
import {
  generateUnique11DigitNumberFromString,
  getBaiduReviewToken,
  getDrawSuccessText,
  getErrorText,
  getImage,
  getRequestInterval,
  imgCensor,
  uploadFile
} from './util';

const { MJ_USER_API_KEY, COS_SECRET_ID = '', COS_SECRET_KEY } = process.env;

const chinesePattern = /[\u4e00-\u9fa5]/;
const { cdn_url } = getMjConfig();

const base_api_url = 'https://api.userapi.ai/midjourney/v2';

/** 处理指令相关的内容 */
// const getUserAPIOperation = async (cmd: CmdData, cos?: COS) => {
//   const key = `${cmd.mj_type}_${cmd.img_id}_${cmd.img_index}`;

//   const cosInstance = cos ?? new COS({ SecretId: CosConfig.secretId.toString(), SecretKey: CosConfig.SecretKey });

//   // 适配重绘指令
//   const type = cmd.mj_type === TaskType.RESET ? 'reroll' : cmd.mj_type;

//   const record = taskManager.getOperRecord(key);

//   if (!!record) {
//     message?.say(`第 ${cmd.img_index} 张图片已经${taskNameMapping[cmd.mj_type]}过了`);
//     return;
//   }

//   const { user_id: userID } = getMessageInfo(message);

//   const data: any = { hash: cmd.img_id };

//   if (cmd.mj_type === TaskType.UPSCALE || cmd.mj_type === TaskType.VARIATION) {
//     data.choice = cmd.img_index;
//   }

//   let response: any;

//   try {
//     response = await axios.post(base_api_url + '/' + type, data, {
//       headers: { 'Content-Type': 'application/json', 'api-key': api_key }
//     });
//   } catch (error) {
//     message?.say(getErrorText('由于神秘力量，本次操作失败，请重新尝试'));
//     return;
//   }

//   if (response.status !== 200) {
//     message?.say(getErrorText('图片生成失败，请稍后再试'));
//     return;
//   }

//   const taskId = response.data.hash;
//   const status = taskManager.addTask(taskId, userID, cmd.mj_type, cmd.mj_type);

//   if (status.status === 'error') {
//     message?.say(status.message);
//     return;
//   }

//   taskManager.addOperRecord(key);

//   // 创建一个新的Worker线程
//   const worker = new Worker('./APIModel/painThread.ts');

//   const count = taskManager.getTaskCount(userID);

//   // 每日超出fast_count， 将轮询时间降为2分钟
//   const timeout = count >= fast_count ? 2 : 0.05;

//   // 发送消息给Worker线程
//   worker.postMessage({ task_id: taskId, user_id: userID, type: Factory.UserAPI, timeout });

//   worker.on('message', async res => {
//     try {
//       console.info('[MJ UserAPI] Operate Received message from Worker:', res);

//       if (res == null) {
//         message?.say(getErrorText('由于神秘力量，本次操作失败，请重新尝试'));

//         taskManager.updateTask(userID, taskId, '', '', TaskStatus.ABORTED);
//         taskManager.deleteOperRecord(key);
//         return;
//       }

//       const { user_id, task_id, result, hash } = res;

//       const task = taskManager.getTask(task_id, user_id);

//       taskManager.updateOperRecord(key);

//       const path = await getImage(result.url, task_id, user_id);

//       await uploadFile(cosInstance, path, hash);
//       const url = `${cdn_url}/${hash}`;

//       try {
//         const fileBox = FileBox.fromUrl(url);
//         await message?.say(fileBox);

//         if (task && (cmd.mj_type === TaskType.RESET || cmd.mj_type === TaskType.VARIATION)) {
//           const hashNumbers = taskManager.getHashNumbers();
//           const imageNumberId = generateUnique11DigitNumberFromString(hash, hashNumbers);
//           taskManager.updateHashNumbers(imageNumberId, hash);

//           const text = getDrawSuccessText({ ...task, img_id: imageNumberId.toString() });

//           // 发送任务成功的通知
//           message?.say(text);
//         }

//         taskManager.updateTask(user_id, task_id, result.url, hash, TaskStatus.FINISHED);
//       } catch (error) {
//         message?.say(getErrorText('图片发送失败，请稍后再试'));
//         taskManager.updateTask(user_id, task_id, result.url, hash, TaskStatus.ABORTED);
//         return;
//       }
//     } catch (error) {
//       console.error('[useAPI] worker message response error: ' + error);
//       taskManager.updateTask(userID, taskId, '', '', TaskStatus.ABORTED);
//     }
//   });

//   const content = `${IconMap[cmd.mj_type]} 图片正在${taskNameMapping[cmd.mj_type]}中，请耐心等待`;
//   message?.say(content);
// };

export const getUserAPIGenerate = async (message: TextMessage, res: any, cmd?: CmdData) => {
  console.log('进入 getUserAPIGenerate');
  if (!!cmd) {
    console.log('！！cmd return');
    // getUserAPIOperation(cmd);
    return;
  }

  const send = (content: string) => {
    res.send({ ...baseReply, MsgType: 'text', Content: content });
  };

  const cosInstance = new COS({
    UseAccelerate: true, // 指定 true，使用全球加速域名请求
    Protocol: 'http:', // 请求协议： 'https:' 或 'http:'
    SecretId: COS_SECRET_ID,
    SecretKey: COS_SECRET_KEY
  });

  const prompt = message.Content;
  const baseReply = getReplyBaseInfo(message);

  let real_prompt = '';
  if (chinesePattern.test(prompt)) {
    try {
      console.log('开始翻译');
      const res = await translate(prompt, { to: 'en' });
      real_prompt = res.text;
    } catch (error) {
      console.error(`[User API] 翻译出错: ${error}`);
    }
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

  const task_id = response.data.hash as number;

  console.log('生态城任务id：', task_id);

  const status = taskManager.addTask(task_id, user_id, prompt, TaskType.GENERATE);

  console.log('新增用户任务: ', status.status);

  if (status.status === 'error') {
    send(status.message);
    return;
  }

  // 创建一个新的Worker线程
  const workerPath = path.join(__dirname, `/app/src/AI/MJ/painThread.ts`);
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
        sendMessage(user_id, `[ERROR]\n由于神秘力量，本次操作失败，请重新尝试\n`);
        if (task_id !== undefined) {
          taskManager.updateTask(user_id, task_id, undefined, undefined, TaskStatus.ABORTED);
        }
        return;
      }

      if (res.status === 'error') {
        sendMessage(user_id, `[ERROR]\n由于神秘力量，本次操作失败，请重新尝试\n${res.status_reason}`);
        if (task_id !== undefined) {
          taskManager.updateTask(user_id, task_id, '', '', TaskStatus.ABORTED);
        }

        return;
      }
    } catch (error) {
      taskManager.updateTask(user_id, task_id, '', '', TaskStatus.ABORTED);
      sendMessage(user_id, `[ERROR]\n由于神秘力量，本次操作失败，请重新尝试`);
    }

    const { user_id: userId, task_id: taskId, result, hash } = res;

    const task = taskManager.getTask(taskId, userId);
    console.log('获取当前轮询任务: ', task);

    console.log('开始下载图片...');
    const path = await getImage(result.url, taskId, userId);
    console.log('图片下载完成: ', path);

    console.log('开始上传图片...');
    await uploadFile(cosInstance, path, hash);
    const url = `${cdn_url}/${hash}/image`;
    console.log('图片完成：', url);

    const access_token = await getBaiduReviewToken();

    // 百度内容审核(图像)
    if (access_token) {
      console.log('开始审核图片');
      try {
        const imgCensorResult = await imgCensor(url, access_token);
        console.log('审核图片结束');

        if (imgCensorResult.status === 'error') {
          const errorMsg =
            `[ERROR] 生成图像违规，存在以下问题 👇\n` + imgCensorResult.messages.map(item => '⚠️ ' + item).join('\n');
          sendMessage(user_id, errorMsg);
          taskManager.updateTask(userId, taskId, '', '', TaskStatus.ABORTED);
          return;
        }
      } catch (error) {
        taskManager.updateTask(userId, taskId, '', '', TaskStatus.ABORTED);
        console.error('[UserAPI] img censor error: ', error);
      }
    }

    try {
      console.log('开始上传素材...');
      const uploadRes = await uploadTemporaryMedia(path, 'image');
      const media_id = uploadRes.media_id;
      console.log('素材上传成功：', media_id);

      await sendImage(user_id, media_id);

      const hashNumbers = taskManager.getHashNumbers();
      const imageNumberId = generateUnique11DigitNumberFromString(hash, hashNumbers);
      taskManager.updateHashNumbers(imageNumberId, hash);

      // 将本次图片id对应起来
      if (task) {
        const text = getDrawSuccessText({ ...task, img_id: imageNumberId.toString() });
        // 发送任务成功的通知
        sendMessage(user_id, text);
      }
      taskManager.updateTask(userId, taskId, result.url, hash, TaskStatus.FINISHED);
    } catch (error) {
      sendMessage(user_id, getErrorText('图片发送失败，请稍后再试'));
      taskManager.updateTask(userId, taskId, result.url, hash, TaskStatus.ABORTED);
    }
  });

  let content = '🚀您的作品将在1分钟左右完成，请耐心等待\n- - - - - - - - -\n';

  if (real_prompt) content += `初始prompt: ${prompt}\n转换后prompt: ${real_prompt}`;
  else content += `prompt: ${prompt}`;

  send(content);
};
