const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  try {
    const question = (event && event.question ? String(event.question) : '').trim();
    if (!question) return { ok: false, error: 'question 不能为空' };

    const conversationHistory = (event && event.conversation_history) || [];

    // const apiKey = process.env.ZHIZENGZENG_API_KEY;
    const apiKey = 'sk-zk2a4da7eae076a209c44fef627ae30ef4768cd76cda7afc';
    const baseUrl = process.env.ZHIZENGZENG_BASE_URL || 'https://api.zhizengzeng.com/v1';
    if (!apiKey) return { ok: false, error: '未配置环境变量 ZHIZENGZENG_API_KEY' };

    const url = `${baseUrl}/chat/completions`;

    const messages = [
      {
        role: 'system',
        content:
          '你是一个谨慎的 AI 医疗助手：提供一般性健康信息与就医建议，不做确诊；遇到急症风险先提示立即就医。',
      },
    ];

    conversationHistory.forEach(turn => {
      if (turn.user_input) {
        messages.push({ role: 'user', content: turn.user_input });
      }
      if (turn.ai_output) {
        messages.push({ role: 'assistant', content: turn.ai_output });
      }
    });

    messages.push({ role: 'user', content: question });

    const resp = await axios.post(
      url,
      {
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.3,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 60000,
      }
    );

    const data = resp.data || {};
    const answer =
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? data.choices[0].message.content
        : '';

    return { ok: true, answer };
  } catch (e) {
    // axios 错误信息更详细
    const status = e && e.response && e.response.status ? e.response.status : '';
    const msg =
      (e && e.response && e.response.data && e.response.data.error && e.response.data.error.message) ||
      (e && e.response && e.response.data && typeof e.response.data === 'string' && e.response.data) ||
      (e && e.message) ||
      String(e);

    return { ok: false, error: status ? `HTTP ${status}: ${msg}` : msg };
  }
};