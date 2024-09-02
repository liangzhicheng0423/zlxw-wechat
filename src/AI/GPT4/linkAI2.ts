import axios from 'axios';
import taskManager from './taskManager';

const { LINK_AI_APP_KEY, LINK_AI_APP_CODE } = process.env;

const api_url = 'https://api.link-ai.tech/v1/chat/memory/completions';

export const getLinkAIReply = async (content: string, userId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      url: api_url,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINK_AI_APP_KEY}-${LINK_AI_APP_CODE}` },
      data: { app_code: LINK_AI_APP_CODE, question: content, session_id: userId }
    };

    console.log('请求：', options);

    axios
      .request(options)
      .then(response => {
        const reply = response.data.choices[0].message.content;

        taskManager.updateContext(userId, content, reply);

        resolve(reply);
      })
      .catch(error => {
        reject(error);
      });
  });
};
