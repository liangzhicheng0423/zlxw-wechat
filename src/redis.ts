import Redis from 'ioredis';
import moment from 'moment';
import cron from 'node-cron';
import { User } from './mysqlModal/user';
import { Product } from './types';

let redisClient: Redis;

const expirationSeconds = 600; // 10分钟的秒数

export const initRedis = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    redisClient = new Redis({
      host: '10.0.0.8', // Redis 服务器的主机名
      port: 6379 // Redis 服务器的端口号
    });

    redisClient.on('error', (err: Error) => {
      console.error('Error connecting to Redis', err);
      reject(err);
    });

    redisClient.on('connect', () => {
      console.log('Connected to Redis');
      redisScheduleTaskStart();
      updateRedis();
      resolve();
    });
  });
};

export const getRedisClient = (): Redis | null => {
  if (!redisClient) {
    console.error('Redis client is not initialized. Call initRedis first.');
    return null;
  }
  return redisClient;
};

// 各种个样的key
/**
 * 1. 模式: ${userId}_mode  // gpt4 || mj
 * 2. 是否是会员: ${userId}_is_vip  // true ｜ false
 * 3. 免费额度: ${userId}_free_count  // number
 */

export const getModeKey = (userId: string) => `${userId}_mode`;

export const getVipKey = (userId: string) => `${userId}_is_vip`;

export const getFreeCountKey = (userId: string, mode: Product) => `${userId}_${mode}_free_count`;

/** 获取当前的模式 */
export const getMode = async (userId: string) => {
  const redis = getRedisClient();
  const value = await redis?.get(getModeKey(userId));
  return (value ?? null) as Product | null;
};

/** 是否是会员 */
export const getIsVip = async (userId: string) => {
  const redis = getRedisClient();
  const value = await redis?.get(getVipKey(userId));
  return (value ?? null) as 'true' | 'false' | null;
};

/** 免费额度 */
export const getFreeCount = async (userId: string, mode: Product) => {
  const redis = getRedisClient();
  const value = await redis?.get(getFreeCountKey(userId, mode));

  console.log('getFreeCount ', userId, value);

  return Number(value || 0);
};

// 消耗免费额度
export const useFreeCount = async (userId: string, mode: Product) => {
  const redis = getRedisClient();
  const count = await getFreeCount(userId, mode);

  console.log('useFreeCount: ', count);
  if (count !== null) {
    const newCount = Math.max(count - 1, 0);
    console.log('newCount: ', newCount);
    await redis?.set(getFreeCountKey(userId, mode), newCount);

    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) return;

    console.log('扣掉免费额度');
    await user.update({ [`${mode}_free_count`]: newCount });
  }
};

export const deleteRedisKey = async (key: string) => {
  const redis = getRedisClient();
  await redis?.del(key);
};

export const setMode = async (userId: string, mode: Product) => {
  const redis = getRedisClient();
  await redis?.set(getModeKey(userId), mode);
  await redis?.expire(getModeKey(userId), expirationSeconds);
};

export const updateUserVipStatus = async (userId: string, status: boolean) => {
  const redis = getRedisClient();
  await redis?.set(getVipKey(userId), status.toString());
};

export const getAllKeysValues = async () => {
  const redis = getRedisClient();
  if (!redis) return;

  const keys: string[] = [];
  const keyValues: { [key: string]: string | null } = {};
  let cursor = '0';

  do {
    const result = await redis.scan(cursor, 'MATCH', '*', 'COUNT', 100);
    cursor = result[0];
    const scannedKeys = result[1];
    keys.push(...scannedKeys);
  } while (cursor !== '0');

  if (keys.length > 0) {
    const values = await redis.mget(keys);
    keys.forEach((key, index) => {
      keyValues[key] = values[index];
    });
  }

  return keyValues;
};

const updateKeysWithPipeline = async (keyValuePairs: { [key: string]: string }) => {
  const redis = getRedisClient();
  if (!redis) return;

  const pipeline = redis.pipeline();

  for (const [key, value] of Object.entries(keyValuePairs)) {
    pipeline.set(key, value);
  }

  try {
    await pipeline.exec();
  } catch (err) {
    console.error('Failed to update keys with PIPELINE', err);
  }
};

/** 更新Redis库 */
export const updateRedis = async () => {
  // 找到所有的用户
  const users = await User.findAll();
  const update: { [key: string]: string } = {};

  const now = moment();
  users.forEach(user => {
    const formatUser = user.toJSON();

    // 是否是会员
    let isVip = false;
    const userGroupExpireDate = formatUser.expire_date_group;
    if (userGroupExpireDate && now.isBefore(userGroupExpireDate)) isVip = true;

    // 免费额度
    const gpt4FreeCount = formatUser.gpt4_free_count ?? 0;
    const mjFreeCount = formatUser.midjourney_free_count ?? 0;

    update[getVipKey(formatUser.user_id)] = isVip.toString();
    update[getFreeCountKey(formatUser.user_id, Product.GPT4)] = gpt4FreeCount.toString();
    update[getFreeCountKey(formatUser.user_id, Product.Midjourney)] = mjFreeCount.toString();
  });

  await updateKeysWithPipeline(update);
};

export const redisScheduleTaskStart = () => {
  // 定义一个定时任务，每分钟执行一次
  cron.schedule('* * * * *', () => {
    updateRedis();
  });
};
