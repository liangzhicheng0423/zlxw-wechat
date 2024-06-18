import { TaskStatus, TextMessage } from '../../types';
import { getReplyBaseInfo, sendMessage, sendVoiceMessage, uploadTemporaryMedia } from '../../util';
import { check } from './check';
import { getLinkAIReply, textToVoice } from './linkAI';
import taskManager from './taskManager';

// 文字聊天
export const chatWithTextAI = async (message: TextMessage, res: any) => {
  const baseReply = getReplyBaseInfo(message);
  const userId = baseReply.ToUserName;
  const text = message.Content;
  const quoteId = userId + '_' + baseReply.CreateTime;

  try {
    const pass = await check(text);

    // 敏感词检测
    if (!pass) {
      res.send({ ...baseReply, MsgType: 'text', Content: '检测到对话中存在违规信息，让我们换个话题吧～' });
      return;
    }

    // 限流策略
    const { status, message: msg = '[Error]' } = taskManager.checkTask(userId);

    console.log('限流：', status, message);
    if (status === 'error') {
      res.send({ ...baseReply, MsgType: 'text', Content: msg });
      return;
    }

    taskManager.addTask(userId, quoteId);

    const reply = await getLinkAIReply(text, userId);

    if (!reply) return;

    if (message.ReplyWithVoice) {
      // 将文字转换为音频
      const mp3Path = await textToVoice(reply);
      // 上传临时素材
      const updateRes = await uploadTemporaryMedia(mp3Path, 'voice');

      await sendVoiceMessage(userId, updateRes.media_id);
    } else {
      await sendMessage(userId, reply);
    }
  } catch (error) {
    console.log('gpt4 reply error: ', error);
    res.send({ ...baseReply, MsgType: 'text', Content: '[ERROR]\n由于神秘力量，本次操作失败，请重新尝试' });
  } finally {
    taskManager.updateTask(userId, quoteId, TaskStatus.Finished);
  }
};
