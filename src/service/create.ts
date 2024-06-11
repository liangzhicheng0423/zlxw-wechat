import axios from 'axios';
import { Menu } from '../constant';

export const create = () => {
  axios
    .post(`https://api.weixin.qq.com/cgi-bin/menu/create`, Menu)
    .then(response => {
      console.log('Menu created:', response.data);
    })
    .catch(error => {
      console.error('Error creating menu:', error);
    });
};
