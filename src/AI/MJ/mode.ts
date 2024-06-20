import { TextMessage } from '../../types';
import { getReplyBaseInfo } from '../../util';
import { BLEND, BLEND_START, CLOSE, DESCRIBE, GET_URL } from './constant';
import taskManager from './taskManager';
import { OPERATE, OperateModeMap, OperateReplayMap } from './types';

export const isOperate = (text: string) => {
  if (!text) return void 0;
  const isGetUrl = GET_URL.some(v => v === text);
  const isBlend = BLEND.some(v => v === text);
  const startBlend = BLEND_START.some(v => v === text);
  const isDescribe = DESCRIBE.some(v => v === text);
  const isClose = CLOSE.some(v => v === text);

  if (isGetUrl) return OPERATE.Url;
  if (isBlend) return OPERATE.Blend;
  if (isDescribe) return OPERATE.Describe;
  if (isClose) return OPERATE.Close;
  if (startBlend) return OPERATE.StartBlend;

  return void 0;
};

export const modeProcess = (message: TextMessage, res: any) => {
  const baseReply = getReplyBaseInfo(message);

  const userId = message.FromUserName;
  // 模式
  const userMode = taskManager.getMode(userId);

  console.log('【mode】 userMode: ', userMode);

  const text = message.Content;
  console.log('【mode】 text: ', text);

  const operateType = isOperate(text);

  console.log('【mode】 operateType: ', operateType);

  const send = (content: string) => {
    res.send({ ...baseReply, MsgType: 'text', Content: content });
  };

  if (operateType === undefined) {
    // 不是模式指令
    return false;
  }

  if (operateType === OPERATE.Url || operateType === OPERATE.Close) {
    if (userMode?.operate === operateType && !taskManager.isExpiration(userId)) {
      send('您已经处于该模式');
      return true;
    }

    // 关闭模式
    if (operateType === OPERATE.Close) {
      taskManager.updateMode(userId, OPERATE.Close);
      send('当前模式已经关闭');
      return true;
    }

    // 是否开启融图
    // if (operateType === OPERATE.StartBlend) {
    //   if (userMode?.operate !== OPERATE.Blend) {
    //     message.say(`⚠️ 当前未开启${OperateModeMap[OPERATE.Blend]}模式，请先开启该模式`);
    //     return;
    //   }
    //   if (userMode?.imageUrls.length <= 1) {
    //     message.say('⚠️ 请上传2-5张图片');
    //     return;
    //   }
    // }

    const canStartMode = taskManager.canStartMode(userId, operateType);

    // 当前正在其他模式中
    if (!canStartMode) {
      if (userMode?.operate !== undefined) {
        send(`您当前正在【${OperateModeMap[userMode.operate]}】模式中，请先退出`);
      } else {
        send(`您当前正在其他模式中，请先退出`);
      }
      return true;
    }

    // 开启某个模式
    taskManager.startMode(userId, operateType);
    send(OperateReplayMap[operateType]);
    return true;
  }
  console.log('【mode】 return false');

  return false;
};
