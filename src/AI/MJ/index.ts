import { getFreeCount, getIsVip, useFreeCount } from '../../redis';
import { Product, TextMessage } from '../../types';
import { getMjConfig, getReplyBaseInfo, getTextReplyUrl } from '../../util';
import { check } from '../check';
import { modeProcess } from './mode';
import taskManager from './taskManager';
import { CmdData } from './types';
import { getUserAPIGenerate } from './userAPI';
import { check_cmd, jaroWinklerDistance, startsWithPrefixes } from './util';

// 绘图
export const chatWithDrawAI = async (message: TextMessage, res: any) => {
  const baseReply = getReplyBaseInfo(message);
  const userId = baseReply.ToUserName;
  const text = message.Content;

  const isVip = await getIsVip(userId);
  const freeCount = await getFreeCount(userId, Product.Midjourney);

  const { midjourney } = getMjConfig();
  const { similar = 0.5, ignore_prefix = [] } = midjourney;

  try {
    // QA匹配
    const hasSimilar = ignore_prefix.find(v => jaroWinklerDistance(v.key, text) > similar);
    if (hasSimilar) {
      res.send({ ...baseReply, MsgType: 'text', Content: hasSimilar.reply });
      return;
    }
    console.log('QA匹配: 未命中');

    if (isVip === 'false') {
      // 消耗免费额度

      console.log('freeCount: ', freeCount);

      if (!freeCount) {
        const reply = ['体验对话剩余：0', `👉🏻 ${getTextReplyUrl('获取助理小吴AI群')}`];

        res.send({ ...baseReply, MsgType: 'text', Content: reply.join('\n\n') });
        return;
      } else {
        await useFreeCount(userId, Product.Midjourney);
      }
    }

    const isModeProcess = await modeProcess(message, res);

    if (isModeProcess) return;

    // 限流策略
    const { status, message: msg = '[Error]' } = taskManager.checkTask(userId);
    if (status === 'error') {
      res.send({ ...baseReply, MsgType: 'text', Content: msg });
      return;
    }
    console.log('限流策略: pass');

    const pass = await check(text);
    console.log('敏感词检测： ', pass);

    // 敏感词检测
    if (!pass) {
      res.send({ ...baseReply, MsgType: 'text', Content: '检测到对话中存在违规信息，让我们换个话题吧～' });
      return;
    }

    let cmd_data: CmdData | undefined = undefined;

    // 检查是否为图片操作命令
    if (startsWithPrefixes(text)) {
      const check_result = check_cmd(text);

      if (check_result.status === 'error') {
        res.send({ ...baseReply, MsgType: 'text', Content: check_result.reply });
        return;
      }

      if (check_result.status === 'success' && check_result.data) {
        const img_id = await taskManager.getHashWithNumber(userId, Number(check_result.data.img_id));

        if (!img_id) {
          res.send({ ...baseReply, MsgType: 'text', Content: '图片id不存在，请重新生成' });
          return;
        }

        cmd_data = { ...check_result.data, img_id };
      }
    }

    await getUserAPIGenerate(message, res, cmd_data);

    if (isVip === 'false' && freeCount) await useFreeCount(userId, Product.Midjourney);
  } catch (error) {
    res.send({ ...baseReply, MsgType: 'text', Content: '[ERROR]\n由于神秘力量，本次操作失败，请重新尝试' });
  } finally {
  }
};
