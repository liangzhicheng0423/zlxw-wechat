// 基础消息接口
interface BaseMessage {
  ToUserName: string; // 开发者微信号
  FromUserName: string; // 发送方帐号（一个OpenID）
  CreateTime: number; // 消息创建时间 （整型）
  MsgType: string; // 消息类型
}

// 文本消息
export interface TextMessage extends BaseMessage {
  MsgType: 'text';
  Content: string; // 文本消息内容
  ReplyWithVoice?: boolean; // 是否以音频形式回复
}

// 图片消息
export interface ImageMessage extends BaseMessage {
  MsgType: 'image';
  PicUrl: string; // 图片链接
  MediaId: string; // 图片消息媒体id，可以调用获取临时素材接口拉取数据
}

// 音频消息
export interface VoiceMessage extends BaseMessage {
  MsgType: 'voice';
  MediaId: string; // 音频消息媒体id，可以调用获取临时素材接口拉取数据
  Format: string; // 语音格式，如amr，speex等
}

// 事件消息
export interface EventMessage extends BaseMessage {
  MsgType: 'event';
  Event: string; // 事件类型
  EventKey?: string; // 事件KEY值，qrscene_为前缀，后面为二维码的参数值
  Ticket?: string; // 二维码的ticket，可用来换取二维码图片
}

// 消息推送接口
export interface MessagePush {
  MsgId?: number; // 消息id，64位整型（仅限普通消息有）
  SendTime?: number; // 消息发送时间（事件消息无）
}

// 定义可能的消息类型
export type WeChatMessage = TextMessage | ImageMessage | EventMessage | VoiceMessage;

// 云托管消息推送处理函数类型
export type MessageHandler = (message: WeChatMessage) => void;

export enum BonusTypeEnum {
  Cash = 'Cash', // 现金奖励
  Integral = 'integral' // 积分
}

export type WeChatPayCallback = {
  timeEnd: string; // 支付完成时间
  outTradeNo: string; // 商户订单号
  transactionId: string; // 微信支付订单号
  cashFee: string; // 现金支付金额
  feeType: string; // 货币种类
  totalFee: string; // 订单金额
  bankType: string; // 付款银行
  tradeType: string; // 交易类型
  subIsSubscribe: string;
  subOpenid: string;
  isSubscribe: string; // 用户是否关注公众账号
  openid: string;
  resultCode: string; // 业务结果
  nonceStr: string; // 随机字符串
  subMchId: string;
  subAppid: string;
  mchId: string; // 微信支付分配的商户号
  appid: string; // 微信分配的公众账号ID
  returnCode: string; // 返回状态码
};

export enum Product {
  GPT4 = 'gpt4',
  Midjourney = 'midjourney',
  Dan = 'dan'
}

export enum VipLevel {
  Year = 'year',
  Quarter = 'quarter',
  Month = 'month',
  Ten = 'ten' // 10份年卡
}

export type OrderBody = { level: VipLevel; product: Product };

export type GPTConfig = {
  factory: 'linkAI'; // 默认策略
  welcome: string; // 欢迎语
  welcome_enable: boolean; // 是否开启欢迎语
  tts_voice_id: 'alloy'; // 语音id
  black_name_list: string[]; // 黑名单列表

  admins: string[];

  use_context: boolean; // 是否开启上下文
  max_context: number; // 上下文最大长度
  max_context_time: number; // 上下文保留时间

  second_interval: number; // 多少秒发送一次消息 默认3秒
  max_messages_per_second: number; // 每${second_interval}秒可发送的最大消息数 默认1条

  limiting_strategy: { count: number; seconds: number }[]; // 限流策略, 当任务总数大于count时，延时${seconds}秒发送消息

  searchKeyWords: string[]; // 触发LinkAI搜索的关键测

  common_msg: string; // 通用消息
  administrator: string; // 管理员name

  linkAI: { temperature: number; api_base: string; api_key: string; app_code: string };
  summary: { enabled: boolean; group_enabled: boolean; max_file_size: number; type: Array<'FILE' | 'SHARING'> };
  GPTAI: { temperature: number; max_tokens: number; api_key: string };
  DUCKAI: { temperature: number; max_tokens: number; api_key: string };
  tutujin: { api_key: string };

  baiduReview: { api_key: string; secret_key: string };
};

export enum TaskStatus {
  Finished,
  Pending
}

export enum Role {
  User = 'user',
  System = 'system',
  Assistant = 'assistant'
}
