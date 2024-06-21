import * as tencentcloud from 'tencentcloud-sdk-nodejs';
import axios from 'axios';
import COS from 'cos-nodejs-sdk-v5';
import natural from 'natural';
import { getMjConfig, getTextReplyUrl } from '../../util';
import { TaskType } from './types';

const { BAIDU_REVIEW_API_KEY, BAIDU_REVIEW_SECRET_KEY, COS_SECRET_ID, COS_SECRET_KEY } = process.env;

/** 匹配相似度 */
export const jaroWinklerDistance = (text1: string, text2: string) => natural.JaroWinklerDistance(text1, text2);

export const startsWithPrefixes = (str: string) => {
  const cmds = str.split(' ');

  const { midjourney } = getMjConfig();
  const { plugin_trigger_prefix = [] } = midjourney;

  if (cmds[0] === '获取' && plugin_trigger_prefix.includes(cmds[1])) {
    return true;
  }

  return false;
};

export const check_cmd = (cmd: string) => {
  const cmds = cmd.split(' ');
  if (cmds.length !== 3) {
    return { status: 'error', reply: '抱歉，命令输入有误，请您输入正确的命令。' };
  }

  const type = cmds[1];

  let imgIndex = 0;

  switch (type) {
    case '左上':
      imgIndex = 1;
      break;
    case '右上':
      imgIndex = 2;
      break;
    case '左下':
      imgIndex = 3;
      break;
    case '右下':
      imgIndex = 4;
      break;
    default:
      break;
  }

  const imageId = cmds[2];

  return {
    status: 'success',
    data: { img_id: imageId, img_index: imgIndex, mj_type: TaskType.UPSCALE }
  };
};

export const getErrorText = (text: string) => '[ERROR]\n' + text;

export const getRequestInterval = (count: number) => {
  const { fast_count, fast_request_interval, slow_request_interval } = getMjConfig();
  return count >= fast_count ? slow_request_interval : fast_request_interval;
};

// 不合规的图片分类
const InvalidImageType = [0, 1, 2, 3, 5, 11, 16, 21];

export const imgCensor = async (
  imgUrl: string,
  accessToken: string
): Promise<{ status: 'success' | 'error'; messages: string[] }> => {
  const options = {
    method: 'POST',
    url: `https://aip.baidubce.com/rest/2.0/solution/v1/img_censor/v2/user_defined?access_token=${accessToken}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    data: { imgUrl }
  };

  return new Promise((resolve, reject) => {
    axios
      .request(options)
      .then(response => {
        if (response.status === 200) {
          if (response.data.conclusionType === 2 || response.data.conclusionType === 3) {
            if (!response.data.data) {
              resolve({ status: 'success', messages: [] });
              return;
            }

            const invalids = response.data.data.filter((v: any) => InvalidImageType.includes(v.type));
            if (!invalids.length) {
              resolve({ status: 'success', messages: [] });
              return;
            }
            const messages = invalids.map((v: any) => v.msg);
            resolve({ status: 'error', messages });
          } else {
            resolve({ status: 'success', messages: [] });
          }
        } else {
          reject(response.status);
        }
      })
      .catch(error => {
        reject(error);
      });
  });
};

/** 获取绘制成功后的消息文本 */
export const getDrawSuccessText = (imageId: number) => {
  const reply = [
    '🎉 图像绘制成功～',
    '您可以点击下方按钮来操作图像',
    '选择：1️⃣     2️⃣     3️⃣     4️⃣',
    '变化：1️⃣     2️⃣     3️⃣     4️⃣',
    '重制：🔄',
    `1. 👉 ${getTextReplyUrl(`获取 左上 ${imageId}`, '左上')}`,
    `2. 👉 ${getTextReplyUrl(`获取 右上 ${imageId}`, '右上')}`,
    `3. 👉 ${getTextReplyUrl(`获取 左下 ${imageId}`, '左下')}`,
    `4. 👉 ${getTextReplyUrl(`获取 右下 ${imageId}`, '右下')}`
  ];
  return reply.join('\n\n');
};

export const uploadFile = (cos: COS, filePath: string, key: string): Promise<COS.UploadFileItemResult> => {
  return new Promise((resolve, reject) => {
    cos.uploadFile({
      Bucket: 'mj-upload-1258647279' /* 填入您自己的存储桶，必须字段 */,
      Region: 'ap-chengdu' /* 存储桶所在地域，例如 ap-beijing，必须字段 */,
      Key: key /* 存储在桶里的对象键（例如1.jpg，a/b/test.txt），必须字段 */,
      FilePath: filePath /* 必须 */,
      SliceSize: 1024 * 1024 * 10 /* 触发分块上传的阈值，超过10MB使用分块上传，非必须 */,
      onTaskReady: function (taskId) {
        /* 非必须 */
        console.log(taskId);
      },
      onProgress: function (progressData) {
        /* 非必须 */
        console.log(JSON.stringify(progressData));
      },
      onFileFinish: function (err, data, options) {
        console.log(data);
        if (err) reject(err);
        else resolve(data);
        /* 非必须 */
        console.log(options.Key + '上传' + (err ? '失败' : '完成'));
      }
    });
  });
};

export const getBaiduReviewToken = async (): Promise<string> => {
  const options = {
    method: 'POST',
    url: `https://aip.baidubce.com/oauth/2.0/token?client_id=${BAIDU_REVIEW_API_KEY}&client_secret=${BAIDU_REVIEW_SECRET_KEY}&grant_type=client_credentials`,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
  };

  return new Promise(resolve => {
    axios
      .request(options)
      .then(response => {
        if (response.status === 200) {
          resolve(response.data.access_token);
        } else {
          resolve('');
        }
      })
      .catch(() => resolve(''));
  });
};

export const generateUnique11DigitNumberFromString = (inputString: string, numberList: string[]): number => {
  // Helper function to generate an 11 digit number from a string
  function generateCandidateNumber(str: string): string {
    // Filter out non-digit characters and join the first 11 digits
    let digits = str.replace(/\D/g, '').slice(0, 11);

    // If less than 11 digits, pad with random digits
    while (digits.length < 11) {
      digits += Math.floor(Math.random() * 10).toString();
    }

    // Ensure it's 11 digits
    return digits.slice(0, 11);
  }

  let candidateNumber: string;

  // Try generating until a unique number is found
  do {
    candidateNumber = generateCandidateNumber(inputString);
  } while (numberList.includes(candidateNumber));

  // Add the unique number to the numberList
  numberList.push(candidateNumber);

  return Number(candidateNumber);
};

// Depends on tencentcloud-sdk-nodejs version 4.0.3 or higher

export const TmtClient = tencentcloud.tmt.v20180321.Client;

// 实例化一个认证对象，入参需要传入腾讯云账户 SecretId 和 SecretKey，此处还需注意密钥对的保密
// 代码泄露可能会导致 SecretId 和 SecretKey 泄露，并威胁账号下所有资源的安全性。以下代码示例仅供参考，建议采用更安全的方式来使用密钥，请参见：https://cloud.tencent.com/document/product/1278/85305
// 密钥可前往官网控制台 https://console.cloud.tencent.com/cam/capi 进行获取
export const clientConfig = {
  credential: { secretId: COS_SECRET_ID, secretKey: COS_SECRET_KEY },
  region: 'ap-hongkong',
  profile: {
    httpProfile: { endpoint: 'tmt.tencentcloudapi.com' }
  }
};

export const imageReview = async (access_token: string, url: string) => {
  try {
    const imgCensorResult = await imgCensor(url, access_token);
    if (imgCensorResult.status === 'error') {
      const errorMsg =
        `[ERROR] 生成图像违规，存在以下问题 👇\n` + imgCensorResult.messages.map(item => '⚠️ ' + item).join('\n');
      return { pass: false, message: errorMsg };
    }

    return { pass: true, message: 'SUCCESS' };
  } catch (error) {
    console.error('[LinkAI] img censor error: ', error);
    return { pass: true, message: 'SUCCESS' };
  }
};
