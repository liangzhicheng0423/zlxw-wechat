import { User } from '../mysqlModal/user';
import { EventMessage } from '../types';
import { award } from './award';

export const subscribe = async (message: EventMessage) => {
  const { FromUserName, EventKey } = message;

  let pid: string | undefined;
  if (EventKey) pid = EventKey.split('_').at(-1);
  if (pid === FromUserName) pid = undefined;

  // 用户订阅
  const [, created] = await User.findOrCreate({
    where: { user_id: FromUserName },
    defaults: { subscribe_status: true, p_id: pid }
  });

  // 只有新增关注才给予奖励
  if (created && pid) await award(pid, 'subscribe');
};
