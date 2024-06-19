import axios from 'axios';
import { Role } from '../../types';
import taskManager from './taskManager';

const { LINK_AI_APP_KEY, LINK_AI_APP_CODE } = process.env;

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
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINK_AI_APP_KEY}-${LINK_AI_APP_CODE}` },
      data: { app_code: LINK_AI_APP_CODE, messages: flatMessage }
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
