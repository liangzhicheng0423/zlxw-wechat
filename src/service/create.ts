import axios from 'axios';

export const create = () => {
  const menuData = {
    button: [
      {
        name: '扫码',
        sub_button: [
          {
            type: 'scancode_waitmsg',
            name: '扫码带提示',
            key: 'rselfmenu_0_0',
            sub_button: []
          },
          {
            type: 'scancode_push',
            name: '扫码推事件',
            key: 'rselfmenu_0_1',
            sub_button: []
          }
        ]
      },
      {
        name: '发图',
        sub_button: [
          {
            type: 'pic_sysphoto',
            name: '系统拍照发图',
            key: 'rselfmenu_1_0',
            sub_button: []
          },
          {
            type: 'pic_photo_or_album',
            name: '拍照或者相册发图',
            key: 'rselfmenu_1_1',
            sub_button: []
          },
          {
            type: 'pic_weixin',
            name: '微信相册发图',
            key: 'rselfmenu_1_2',
            sub_button: []
          }
        ]
      },
      {
        type: 'media_id',
        name: '图片',
        media_id: 'MEDIA_ID1'
      }
    ]
  };

  axios
    .post(`https://api.weixin.qq.com/cgi-bin/menu/create`, menuData)
    .then(response => {
      console.log('Menu created:', response.data);
    })
    .catch(error => {
      console.error('Error creating menu:', error);
    });
};
