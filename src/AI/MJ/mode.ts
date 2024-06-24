import { TextMessage } from '../../types';
import { getReplyBaseInfo } from '../../util';
import { BLEND, BLEND_START, CLOSE, DESCRIBE, GET_URL } from './constant';
import taskManager from './taskManager';
import { OPERATE, OperateModeMap, OperateReplayMap } from './types';
import { blendImage } from './userAPI';

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

export const modeProcess = async (message: TextMessage, res: any) => {
  const baseReply = getReplyBaseInfo(message);

  const userId = message.FromUserName;
  // 模式
  const userMode = taskManager.getMode(userId);

  const text = message.Content;

  const operateType = isOperate(text);

  const send = (content: string) => {
    res.send({ ...baseReply, MsgType: 'text', Content: content });
  };

  if (operateType === undefined) {
    // 不是模式指令
    return false;
  }

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
  if (operateType === OPERATE.StartBlend) {
    if (userMode?.operate !== OPERATE.Blend) {
      send(`⚠️ 当前未开启${OperateModeMap[OPERATE.Blend]}模式`);
      return true;
    }

    if (userMode?.imageUrls.length <= 1) {
      send(`⚠️ 请上传2-5张图片`);
      return true;
    }

    console.log('【mode -1】 开始融图');
    // 开始融图
    await blendImage(message, res);
    taskManager.updateMode(userId, OPERATE.Close);
    return true;
  }

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
};
