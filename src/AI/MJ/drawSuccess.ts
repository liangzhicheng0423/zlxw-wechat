import { getImage, sendImage, sendMessage, uploadTemporaryMedia } from '../../util';
import taskManager from './taskManager';
import { DrawSuccess, TaskStatus } from './types';
import {
  generateUnique11DigitNumberFromString,
  getBaiduReviewToken,
  getDrawSuccessText,
  getErrorText,
  imgCensor
} from './util';

export const drawSuccess = async (req: any, res: any) => {
  try {
    const result: DrawSuccess = req.body;
    const { userId, taskId, imageUrl } = result;

    if (result.status === 'failed') {
      taskManager.updateTask(userId, taskId, '', '', TaskStatus.ABORTED);
      await sendMessage(userId, `[ERROR]\n由于神秘力量，本次操作失败，请重新尝试\n${result.message}`);
      return;
    }

    if (!imageUrl) {
      taskManager.updateTask(userId, taskId, '', '', TaskStatus.ABORTED);
      return;
    }

    const access_token = await getBaiduReviewToken();

    // 百度内容审核(图像)
    if (access_token) {
      console.log('开始审核图片');
      try {
        const imgCensorResult = await imgCensor(imageUrl, access_token);
        console.log('审核图片结束');

        if (imgCensorResult.status === 'error') {
          const errorMsg =
            `[ERROR] 生成图像违规，存在以下问题 👇\n` + imgCensorResult.messages.map(item => '⚠️ ' + item).join('\n');
          await sendMessage(userId, errorMsg);
          taskManager.updateTask(userId, taskId, '', '', TaskStatus.ABORTED);
          return;
        }
      } catch (error) {
        taskManager.updateTask(userId, taskId, '', '', TaskStatus.ABORTED);
        console.error('[UserAPI] img censor error: ', error);
      }
    }

    const path = await getImage(imageUrl, taskId, userId);

    try {
      console.log('开始上传素材...');
      const uploadRes = await uploadTemporaryMedia(path, 'image');
      const media_id = uploadRes.media_id;
      console.log('素材上传成功：', media_id);

      await sendImage(userId, media_id);

      const hashNumbers = await taskManager.getHashNumbers(userId);
      const imageNumberId = generateUnique11DigitNumberFromString(taskId, hashNumbers);
      await taskManager.updateHashNumbers(userId, imageNumberId, taskId);

      const task = taskManager.getTask(taskId, userId);

      // 将本次图片id对应起来
      console.log('获取task: ', task);
      if (task) {
        const text = getDrawSuccessText(imageNumberId);
        // 发送任务成功的通知
        await sendMessage(userId, text);
      }

      taskManager.updateTask(userId, taskId, imageUrl, taskId, TaskStatus.FINISHED);
    } catch (error) {
      await sendMessage(userId, getErrorText('图片发送失败，请稍后再试'));
      taskManager.updateTask(userId, taskId, imageUrl, taskId, TaskStatus.ABORTED);
    }
  } catch (error) {
    console.log(error);
  }
};
