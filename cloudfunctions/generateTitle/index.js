const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  try {
    const userInput = (event && event.userInput ? String(event.userInput) : '').trim();
    if (!userInput) return { ok: false, error: 'userInput 不能为空' };

    const apiKey = 'sk-zk2a4da7eae076a209c44fef627ae30ef4768cd76cda7afc';
    const baseUrl = process.env.ZHIZENGZENG_BASE_URL || 'https://api.zhizengzeng.com/v1';
    if (!apiKey) return { ok: false, error: '未配置环境变量 ZHIZENGZENG_API_KEY' };

    const url = `${baseUrl}/chat/completions`;

    const resp = await axios.post(
      url,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              '你是一个对话标题生成助手。根据用户的输入，生成一个简洁明了的标题，不超过20个字。只返回标题本身，不要有任何其他内容。',
          },
          { role: 'user', content: userInput },
        ],
        temperature: 0.3,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 30000,
      }
    );

    const data = resp.data || {};
    let title =
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? data.choices[0].message.content
        : '';

    title = title.trim().substring(0, 20);
    if (!title) {
      title = userInput.substring(0, 20);
    }

    return { ok: true, title };
  } catch (e) {
    const status = e && e.response && e.response.status ? e.response.status : '';
    const msg =
      (e && e.response && e.response.data && e.response.data.error && e.response.data.error.message) ||
      (e && e.response && e.response.data && typeof e.response.data === 'string' && e.response.data) ||
      (e && e.message) ||
      String(e);

    const userInput = (event && event.userInput ? String(event.userInput) : '').trim();
    const title = userInput.substring(0, 20);

    return { ok: true, title, error: status ? `HTTP ${status}: ${msg}` : msg };
  }
};
