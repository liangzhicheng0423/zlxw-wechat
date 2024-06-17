import axios from 'axios';
import fs from 'fs';
import { Role } from '../../types';
import { getConfig } from '../../util';
import taskManager from './taskManager';

const { tts_voice_id, linkAI } = getConfig();

const { api_base, api_key, app_code } = linkAI;

const api_url = 'https://api.link-ai.chat/v1/chat/completions';

export const getLinkAIReply = async (content: string, userId: string): Promise<string> => {
  const conversationHistory = taskManager.getContext(userId);

  const messages = conversationHistory.map(v => {
    if (v.role === Role.User) return { role: 'user', content: v.q };
    if (v.role === Role.Assistant) return { role: 'assistant', content: v.a };
    return v;
  });

  const flatMessage = [...messages, { role: 'user', content }];

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      url: api_url,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api_key}-${app_code}` },
      data: { app_code, messages: flatMessage }
    };

    console.log('请求：', options);

    axios
      .request(options)
      .then(response => {
        const reply = response.data.choices[0].message.content;

        console.log('回复:', reply);
        taskManager.updateContext(userId, content, reply);

        resolve(reply);
      })
      .catch(error => {
        reject(error);
      });
  });
};

export const textToVoice = async (text: string): Promise<string> => {
  const url = `${api_base}/audio/speech`;
  const options = {
    method: 'POST',
    url,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api_key}` },
    data: { model: 'tts-1', input: text, voice: tts_voice_id, app_code }
  };

  return new Promise((resolve, reject) => {
    axios
      .request(options)
      .then(response => {
        const tmp_file_name = 'tmp/' + Date.now() + Math.random() * 1000 + '.mp3';
        fs.writeFile(tmp_file_name, response.data, err => {});
        resolve(tmp_file_name);
      })
      .catch(error => {
        reject('error: ' + error);
      });
  });
};
