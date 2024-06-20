import axios from 'axios';
import fs from 'fs';

const { BAIDU_REVIEW_API_KEY, BAIDU_REVIEW_SECRET_KEY } = process.env;

const detectAndReplace = (text: string[], sensitiveWords: string[]) => {
  const result: string[] = [];
  let isSensitive = false;
  const invalidWords: string[] = [];
  for (let item of text) {
    let word = item.trim();

    // 如果单词是中文
    if (/[\u4e00-\u9fa5]/.test(word)) {
      // 检查敏感词是否包含该中文
      const sensitiveWord = sensitiveWords.find(w => {
        if (!w) return false;
        const regex = new RegExp(escape(w).trim());
        return regex.test(word);
      });

      if (sensitiveWord) {
        isSensitive = true;
        // 替换敏感词部分为 ***
        const censoredWord = word.replace(sensitiveWord, '***');
        invalidWords.push(sensitiveWord);
        result.push(censoredWord);
      } else {
        result.push(word);
      }
    } else {
      // 如果单词是英文
      const sensitiveWord = sensitiveWords.find(w => w.toLowerCase() === word.toLowerCase());
      if (sensitiveWord) {
        isSensitive = true;
        // 替换为 ***
        result.push('***');
        invalidWords.push(word);
      } else {
        result.push(word);
      }
    }
  }
  return { result, isSensitive, invalidWords };
};

export const stringToWordsArray = (str: string) => {
  // 使用正则表达式匹配单词
  const words = str.match(/[\u4e00-\u9fa5\w]+/g);
  const result: string[] = [];

  if (words) {
    let currentWord = '';
    for (let word of words) {
      // 如果当前单词是中文字符，且前一个单词也是中文字符，则合并为一个新元素
      if (/[\u4e00-\u9fa5]/.test(word) && /[\u4e00-\u9fa5]/.test(currentWord)) {
        result[result.length - 1] += word;
      } else {
        result.push(word);
      }
      currentWord = word;
    }
  }
  // 返回匹配到的单词数组
  return result;
};

const detectSensitiveWords = (text: string) => {
  const banWords = fs.readFileSync('./banwords.txt', 'utf8').trim().split('\n');
  console.log('banWords: ', banWords.length);

  const formatText = stringToWordsArray(text);

  const { result, isSensitive, invalidWords } = detectAndReplace(formatText, banWords);

  return { message: result.join(' '), isSensitive, invalidWords };
};

const conclusionType = [
  { type: 1, pass: true }, // 合规
  { type: 2, pass: false }, // 不合规
  { type: 3, pass: false }, // 疑似
  { type: 4, pass: true } // 审核失败
];

const InvalidType = 11; // 百度官方违禁词库

export const getBaiduReview = (): Promise<string> => {
  const options = {
    method: 'POST',
    url: `https://aip.baidubce.com/oauth/2.0/token?client_id=${BAIDU_REVIEW_API_KEY}&client_secret=${BAIDU_REVIEW_SECRET_KEY}&grant_type=client_credentials`,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
  };

  return new Promise(resolve => {
    axios
      .request(options)
      .then(response => {
        if (response.status === 200) resolve(response.data.access_token);
        else resolve('');
      })
      .catch(() => resolve(''));
  });
};

const textCensor = async (text: string): Promise<boolean> => {
  const access_token = await getBaiduReview();
  const options = {
    method: 'POST',
    url: `https://aip.baidubce.com/rest/2.0/solution/v1/text_censor/v2/user_defined?access_token=${access_token}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    data: { text }
  };

  return new Promise((resolve, reject) => {
    axios
      .request(options)
      .then(response => {
        if (response.status === 200) {
          const pass = conclusionType.filter(v => v.pass);

          if (pass.map(v => v.type).includes(response.data.conclusionType)) {
            resolve(true);
            return;
          }

          const formatData = response.data.data.filter((v: any) => v.type === InvalidType);

          if (!formatData.length) {
            resolve(true);
            return;
          }

          resolve(false);
        } else {
          reject(response.status);
        }
      })
      .catch(reject);
  });
};

export const check = async (text: string) => {
  // 本地敏感词检测

  console.log('本地敏感词检测: ', text);
  const { isSensitive } = detectSensitiveWords(text);
  console.log('isSensitive: ', isSensitive);
  if (isSensitive) return false;

  // 百度内容审核(文本)
  try {
    const pass = await textCensor(text);

    console.log('pass: ', pass);

    if (!pass) return false;

    return true;
  } catch (error) {
    console.log('[bot] baidu review failed: ', error);
    return true;
  }
};
