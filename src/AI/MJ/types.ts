export enum OPERATE {
  Url,
  Blend,
  StartBlend,
  Describe,
  Close
}

export enum TaskStatus {
  PENDING = 'pending',
  FINISHED = 'finished',
  EXPIRED = 'expired',
  ABORTED = 'aborted'
}

export enum TaskType {
  GENERATE = 'generate',
  UPSCALE = 'upscale',
  VARIATION = 'variation',
  RESET = 'reset'
}

export type Task = {
  task_id: number; // 任务id
  user_id: string; // 用户id
  task_type: TaskType; // 任务类型
  raw_prompt: string; // 原始描述
  expiry_time?: number; // 过期时间
  status: TaskStatus; // 状态
  img_url?: string;
  img_id?: string;
};

export type MJConfig = {
  welcome: string; // 新人进群欢迎语
  welcome_enable: boolean; // 是否开启欢迎语
  cdn_url: string; // 图片存储桶加速域名

  fast_count: number; // 每日快速任务上限
  fast_request_interval: number; // 快速模式MJ轮询任务时间间隔 (毫秒)
  slow_request_interval: number; // 慢速模式MJ轮询任务时间间隔 (毫秒)

  linkAI: { api_base: string };

  midjourney: {
    api_base: string;
    enabled: boolean;
    auto_translate: boolean;
    img_proxy: boolean;
    max_tasks: number;
    max_tasks_per_user: number;
    plugin_trigger_prefix: string[];
    ingore_prefix: { key: string; reply: string }[];
    similar: number;
  };

  summary: {
    enabled: boolean;
    group_enabled: boolean;
    max_file_size: number;
    type: Array<'FILE' | 'SHARING'>;
  };
};

export type CmdData = {
  img_id: string;
  img_index: number;
  mj_type: TaskType;
};

export const taskNameMapping: { [key in TaskType]: string } = {
  [TaskType.GENERATE]: '生成',
  [TaskType.UPSCALE]: '放大',
  [TaskType.VARIATION]: '变换',
  [TaskType.RESET]: '重新生成'
};

export enum Factory {
  LinkAI = 'linkAI',
  UserAPI = 'UserAPI'
}

export const IconMap = {
  [TaskType.UPSCALE]: '🔎',
  [TaskType.VARIATION]: '🪄',
  [TaskType.RESET]: '🔄',
  [TaskType.GENERATE]: '🪄'
};
