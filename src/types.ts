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
}

// 图片消息
export interface ImageMessage extends BaseMessage {
  MsgType: 'image';
  PicUrl: string; // 图片链接
  MediaId: string; // 图片消息媒体id，可以调用获取临时素材接口拉取数据
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
export type WeChatMessage = TextMessage | ImageMessage | EventMessage;

// 云托管消息推送处理函数类型
export type MessageHandler = (message: WeChatMessage) => void;
