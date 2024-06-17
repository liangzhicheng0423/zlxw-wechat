import cron from 'node-cron';
import { Role, TaskStatus } from '../../types';
import { getConfig } from '../../util';

const { max_context, max_context_time } = getConfig();

class TaskManager {
  private maxUserTask = 3;
  private maxTask = 300;

  /**
   * 单人并发任务
   * key: userId
   * value: {
   *  quoteId: string,
   *  status: TaskStatus
   * }[]
   */
  private tasks: { [key in string]: { quoteId: string; status: TaskStatus }[] } = {};

  /** 上下文 */
  private context: {
    [key in string]: { q: string; a: string; time: number; role: Role }[];
  } = {};

  /**
   * 单人日上限
   * key: userId
   * value: number
   */
  private taskTotal: { [key in string]: number } = {};

  /** 获取当前用户的上下文 */
  getContext(userId: string) {
    const currentTimeInMilliseconds = Date.now();
    // 将时间戳转换为秒数
    const time = Math.floor(currentTimeInMilliseconds / 1000);

    // 过滤掉超时的上下文
    const currentContext = this.context[userId];
    if (!currentContext) return [];

    let filterContext = currentContext.filter(v => time - v.time < max_context_time * 60);
    // 判断上下文是否大于 max_context

    if (filterContext.length >= max_context * 2) {
      filterContext = filterContext.slice(filterContext.length - (max_context * 2 + 1));
    }

    return filterContext;
  }

  /** 更新上下文 */
  updateContext(userId: string, q: string, a: string) {
    const currentContext = this.getContext(userId);
    // 获取当前的时间戳（毫秒）
    const currentTimeInMilliseconds = Date.now();
    // 将时间戳转换为秒数
    const time = Math.floor(currentTimeInMilliseconds / 1000);
    const current = [
      { q, a, time, role: Role.User },
      { q, a, time, role: Role.Assistant }
    ];

    if (!currentContext.length) {
      this.context[userId] = current;
      return;
    }

    // 记录上下文
    this.context[userId] = currentContext.concat(current);
  }

  /** 获取用户当日发送成功量 */
  getUserTasks(userId: string) {
    return this.taskTotal[userId] ?? 0;
  }

  checkTask(userId: string) {
    const currentTask = this.tasks[userId]?.filter(v => v.status === TaskStatus.Pending);

    if (currentTask && currentTask.length >= this.maxUserTask) {
      return { status: 'error', message: '输入太快啦，请慢一点' };
    }

    const task_count = this.taskTotal[userId];
    if (task_count && task_count >= this.maxTask) {
      return { status: 'error', message: '[ERROR]\n由于神秘力量，本次操作失败，可在明日06:00后重新尝试' };
    }

    return { status: 'success' };
  }

  /** 新增任务 */
  addTask(userId: string, quoteId: string) {
    try {
      const data = this.checkTask(userId);

      if (data.status === 'error') return data;

      const initTask = { quoteId, status: TaskStatus.Pending };

      if (!this.tasks[userId]) this.tasks[userId] = [initTask];
      else this.tasks[userId].push(initTask);

      return { status: 'success', message: '任务创建成功' };
    } catch (error) {
      return { status: 'error', message: '由于神秘力量，GPT创建任务失败，请您稍后重试' };
    }
  }

  updateTask(userId: string, quoteId: string, status = TaskStatus.Finished) {
    try {
      const currentTask = this.tasks[userId].filter(v => v.quoteId === quoteId);
      if (!currentTask) return;

      this.tasks[userId] = this.tasks[userId]
        .map(v => (v.quoteId === quoteId ? { ...v, status } : v))
        .filter(v => v.status !== TaskStatus.Finished);

      // 更新当日总量
      if (status === TaskStatus.Finished) {
        const count = this.taskTotal[userId] ?? 0;
        if (!this.taskTotal[userId]) this.taskTotal[userId] = 1;
        else this.taskTotal[userId] = count + 1;
      }

      if (this.tasks[userId] && !this.tasks[userId].length) delete this.tasks[userId];
    } catch (error) {
      console.error('[TaskManager] updateTask failed: ' + error);
    }
  }

  clear() {
    this.tasks = {};
    this.taskTotal = {};
  }

  clearEveryDay() {
    // 每天凌晨6点重置
    cron.schedule(
      '0 6 * * *',
      () => {
        console.log('Clearing current limit');
        this.clear();
      },
      {
        scheduled: true,
        timezone: 'Asia/Shanghai' // 设置时区为上海
      }
    );
  }
}

const taskManager = new TaskManager();
taskManager.clearEveryDay();
export default taskManager;
