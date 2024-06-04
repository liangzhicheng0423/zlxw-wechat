import axios from 'axios';

export const getShareQRcode = async () => {


  console.log('请求')
    const response = await axios.post(
      'https://api.weixin.qq.com/cgi-bin/qrcode/create',
      {"action_name": "QR_LIMIT_STR_SCENE", "action_info": {"scene": {"scene_str": "test"}}},
    );

    const res = response.data;
    console.log('res', res)
}