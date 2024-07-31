import { getFreeCount, getIsVip, useFreeCount } from '../../redis';
import { Product, TaskStatus, TextMessage } from '../../types';
import {
  cancelTyping,
  getReplyBaseInfo,
  getTextReplyUrl,
  sendMessage,
  sendVoiceMessage,
  textToVoice,
  typing,
  uploadTemporaryMedia
} from '../../util';
import { check } from '../check';
import { getLinkAIReply } from './linkAI';
import taskManager from './taskManager';

// 文字聊天
export const chatWithTextAI = async (message: TextMessage, res: any) => {
  const baseReply = getReplyBaseInfo(message);
  const userId = baseReply.ToUserName;
  const text = message.Content;
  const quoteId = userId + '_' + baseReply.CreateTime;
  const isVip = await getIsVip(userId);
  const freeCount = await getFreeCount(userId, Product.GPT4);

  console.log('isVip: ', isVip);

  const done = () => {
    taskManager.updateTask(userId, quoteId, TaskStatus.Finished);
  };

  await typing(userId);

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

    if (isVip === 'false') {
      // 消耗免费额度

      console.log('freeCount: ', freeCount);

      if (!freeCount) {
        const reply = ['体验对话剩余：0', `👉🏻 ${getTextReplyUrl('获取助理小吴AI群')}`];

        res.send({
          ...baseReply,
          MsgType: 'text',
          Content: reply.join('\n\n')
        });
        return;
      }
    }

    taskManager.addTask(userId, quoteId);

    const reply = await getLinkAIReply(text, userId);

    if (!reply) {
      done();
      return;
    }

    console.log('message.ReplyWithVoice', message.ReplyWithVoice);

    if (message.ReplyWithVoice) {
      // 将文字转换为音频
      console.log('【文字转语音】');
      const mp3Path = await textToVoice(reply);
      console.log('【文字转语音】 转换后的地址: ', mp3Path);
      console.log('mp3Path', mp3Path);
      if (!mp3Path) {
        // await sendMessage(userId, '抱歉，请再说一次吧～');
        res.send({ ...baseReply, MsgType: 'text', Content: '抱歉，请再说一次吧～' });
        done();
        return;
      }

      // 上传临时素材
      const updateRes = await uploadTemporaryMedia(mp3Path, 'voice');

      console.log('updateRes', updateRes);

      await sendVoiceMessage(userId, updateRes.media_id);
    } else {
      await sendMessage(userId, reply);
    }

    if (isVip === 'false' && freeCount) await useFreeCount(userId, Product.GPT4);
  } catch (error) {
    console.log('gpt4 reply error: ', error);
    res.send({ ...baseReply, MsgType: 'text', Content: '[ERROR]\n由于神秘力量，本次操作失败，请重新尝试' });
  } finally {
    done();
    await cancelTyping(userId);
  }
};
