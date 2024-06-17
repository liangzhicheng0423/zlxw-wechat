import { TaskStatus, TextMessage } from '../../types';
import { getReplyBaseInfo } from '../../util';
import { check } from './check';
import { getLinkAIReply } from './linkAI';
import taskManager from './taskManager';

// 文字聊天
export const chatWithTextAI = async (message: TextMessage, res: any) => {
  const baseReply = getReplyBaseInfo(message);
  const userId = baseReply.FromUserName;
  const text = message.Content;
  const pass = await check(text);

  // 敏感词检测
  if (!pass) {
    res.send({ ...baseReply, MsgType: 'text', Content: '检测到对话中存在违规信息，让我们换个话题吧～' });
    return;
  }

  // 限流策略
  const { status, message: msg = '[Error]' } = taskManager.checkTask(userId);
  if (status === 'error') {
    res.send({ ...baseReply, MsgType: 'text', Content: msg });
    return;
  }

  const quoteId = baseReply.FromUserName + '_' + baseReply.CreateTime;

  taskManager.addTask(userId, quoteId);

  try {
    const reply = await getLinkAIReply(text, userId);
    if (!reply) return;

    res.send({ ...baseReply, MsgType: 'text', Content: reply });
  } catch (error) {
    console.log('gpt4 reply error: ', error);
    res.send({ ...baseReply, MsgType: 'text', Content: '[ERROR]\n由于神秘力量，本次操作失败，请重新尝试' });
  } finally {
    taskManager.updateTask(userId, quoteId, TaskStatus.Finished);
  }
};
