import { getRedisClient } from '../../redis';
import { getNow } from '../../util';
import { Nill } from './constant';
import { OPERATE, Task, TaskStatus, TaskType } from './types';

const getHashKey = (userId: string, imageId: number) => {
  return `image-hash-map-${userId}-${imageId}`;
};

async function getMatchingKeys(pattern: string): Promise<string[] | undefined> {
  const redis = getRedisClient();
  if (!redis) return;

  let cursor = '0';
  const matchingKeys: string[] = [];

  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = newCursor;
    matchingKeys.push(...keys);
  } while (cursor !== '0');

  return matchingKeys;
}

const expirationSeconds = 60 * 60 * 24;

class TaskManager {
  private maxUserTask = 1;
  private maxTask = 3;

  // 图片id和数字之间的对应关系
  private hashNumberMap: { [key in number]: string } = {};

  /** 绘图任务 */
  private tasks: { [key in string]: Task[] } = {};

  /** 记录操作过的图片 */
  private operRecord: { [key in string]: boolean } = {};

  /** 过期时间 */
  private expiration = 60 * 5; // 秒

  /** 各个模式阈值 */
  private modeThreshold = {
    max: {
      [OPERATE.Url]: 1,
      [OPERATE.Blend]: 5,
      [OPERATE.Describe]: 1,
      [OPERATE.Close]: Nill,
      [OPERATE.StartBlend]: Nill
    },
    min: {
      [OPERATE.Url]: Nill,
      [OPERATE.Blend]: 2,
      [OPERATE.Describe]: Nill,
      [OPERATE.Close]: Nill,
      [OPERATE.StartBlend]: Nill
    }
  };

  /** 记录用户是否开启某个模式 */
  private mode: {
    [key in string]: {
      isOpen: boolean;
      lastTime: number;
      count: number;
      // 图片地址
      imageUrls: string[];
      operate?: OPERATE;
    };
  } = {};

  async getHashNumbers(userId: string) {
    const keys = await getMatchingKeys(`image-hash-map-${userId}-*`);
    return keys ?? [];
  }

  async getHashWithNumber(userId: string, imageId: number) {
    const redis = getRedisClient();
    if (!redis) return;
    const hash = await redis.get(getHashKey(userId, imageId));
    return hash;
  }

  async updateHashNumbers(userId: string, imageId: number, hash: string) {
    // 缓存到redis中
    const redis = getRedisClient();
    if (!redis) return;

    const key = getHashKey(userId, imageId);
    await redis.set(key, hash);

    // 缓存24小时
    await redis.expire(key, expirationSeconds);
  }

  isModing(userId: string) {
    const user = this.mode[userId];
    if (!user) return void 0;
    const now = getNow();
    const gap = now - user.lastTime;
    if (!user.isOpen || gap > this.expiration) return void 0;

    return user.operate;
  }

  isExpiration(userId: string) {
    const user = this.mode[userId];
    if (!user) return true;
    const now = getNow();
    const gap = now - (user.lastTime || 0);
    if (gap > this.expiration) return true;
    return false;
  }

  // 判断是否超出阈值
  isOverage(userId: string, operate: OPERATE) {
    if (operate === OPERATE.Close) return false;

    const user = this.mode[userId];
    if (!user || user.operate === undefined) return false;

    const max = this.modeThreshold.max[operate];
    if (max <= 0) return false;

    if (user.count < max) return false;
    return true;
  }

  canStartMode(userId: string, operate: OPERATE) {
    if (operate === OPERATE.Close) return true;
    const user = this.mode[userId];
    if (!user) return true;

    const now = getNow();
    const gap = now - user.lastTime;

    if (user.isOpen && gap <= this.expiration) return false;

    return true;
  }

  startMode(userId: string, operate: OPERATE) {
    this.mode[userId] = { isOpen: true, lastTime: getNow(), count: 0, operate, imageUrls: [] };
  }

  // 更新用户开启/关闭模式
  updateMode(userId: string, operate: OPERATE, imageUrl?: string) {
    const user = this.mode[userId];
    // 关闭模式
    if (operate === OPERATE.Close) {
      if (user) {
        this.mode[userId].isOpen = false;
        this.mode[userId].lastTime = Nill;
        this.mode[userId].count = 0;
        this.mode[userId].operate = undefined;
        this.mode[userId].imageUrls = [];
      }
    } else {
      const imgs = this.mode[userId].imageUrls ?? [];
      if (imageUrl) imgs.push(imageUrl);
      this.mode[userId] = { isOpen: true, lastTime: getNow(), count: (user?.count ?? 0) + 1, operate, imageUrls: imgs };
    }
  }

  // 是否已经退出mode
  isCloseMode(userId: string) {
    const user = this.mode[userId];
    if (!user) return true;

    const now = getNow();
    const gap = now - user.lastTime;

    if (!user.isOpen || gap > this.expiration) return true;
    return false;
  }

  // 获取用户当前的模式
  getMode(userId: string) {
    return this.mode[userId];
  }

  /** 检查任务是否超出上限 */
  checkTask(user_id: string) {
    const currentTask = this.tasks[user_id]?.filter(v => v.status === TaskStatus.PENDING) ?? [];

    if (currentTask.length >= this.maxUserTask) {
      return { status: 'error', message: '您的Midjourney作图任务数已达上限，请稍后再试' };
    }
    return { status: 'success', message: '' };
  }

  getTaskCount(user_id: string) {
    console.log('用户当前天任务总量', { user_id, userTask: this.tasks[user_id] });
    return this.tasks[user_id]?.filter(v => v.status === TaskStatus.FINISHED)?.length ?? 0;
  }

  getTask(task_id: string, user_id: string) {
    console.info('[TaskManager] get all task:', this.tasks);
    return this.tasks[user_id]?.find(v => v.task_id === task_id);
  }

  /** 新增任务 */
  addTask(task_id: string, user_id: string, raw_prompt: string, task_type = TaskType.GENERATE) {
    try {
      const check = this.checkTask(user_id);
      if (check?.status === 'error') return check;

      const task_count = Object.keys(this.tasks).reduce((acc, key) => {
        const value = this.tasks[key];
        const length = value.filter(v => v.status === TaskStatus.PENDING).length;
        return acc + length;
      }, 0);

      if (task_count >= this.maxTask) {
        return { status: 'error', message: 'Midjourney作图任务数已达上限，请稍后再试' };
      }

      const initTask = { task_id, user_id, task_type, raw_prompt, status: TaskStatus.PENDING };

      if (!this.tasks[user_id]) this.tasks[user_id] = [initTask];
      else this.tasks[user_id].push(initTask);

      return { status: 'success', message: '任务创建成功' };
    } catch (error) {
      return { status: 'error', message: '由于神秘力量，Midjourney作图任务创建失败，请您稍后重试' };
    }
  }

  updateTask(user_id: string, task_id: string, img_url?: string, img_id?: string, status = TaskStatus.FINISHED) {
    try {
      const currentTask = this.tasks[user_id].filter(v => v.task_id === task_id);
      if (!currentTask) return;

      this.tasks[user_id] = this.tasks[user_id].map(v => {
        if (v.task_id === task_id) return { ...v, status, img_url, img_id };
        return v;
      });

      if (!this.tasks[user_id].length) delete this.tasks[user_id];
    } catch (error) {
      console.error('[TaskManager] updateTask falied: ' + error);
    }
  }

  /** 新增操作记录 */
  addOperRecord(key: string) {
    this.operRecord[key] = true;
  }

  /** 新增操作记录 */
  deleteOperRecord(key: string) {
    delete this.operRecord[key];
  }

  /** 更新操作记录 */
  updateOperRecord(key: string) {
    try {
      this.operRecord[key] = true;
    } catch (error) {
      console.error('[TaskManager] updateOperRecord error:', error);
    }
  }

  /** 获取指定的操作记录 */
  getOperRecord(key: string) {
    console.info('[TaskManager] get all operRecord:', this.operRecord);
    return this.operRecord[key];
  }

  run() {
    setInterval(() => {
      console.log(this.tasks);
    }, 3000);
  }
}

const taskManager = new TaskManager();
export default taskManager;
