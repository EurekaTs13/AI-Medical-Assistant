const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const PINECONE_API_KEY = 'pcsk_6uug5k_JoZj54jCFrZfqmWDpbeamKbwBRyA9WAKDjRtyBW83YWLrEUcAafv4GTt63m9Rhk';
const PINECONE_INDEX_NAME = 'diabetes';
const PINECONE_NAMESPACE = 'default';

async function getEmbedding(text) {
  const url = 'https://api.pinecone.io/embed';
  
  try {
    const resp = await axios.post(
      url,
      {
        model: 'llama-text-embed-v2',  // 一定要和入库时使用的模型一致
        inputs: [{ text: text }],
        parameters: {
          input_type: 'query'
        }
      },
      {
        headers: {
          'Api-Key': PINECONE_API_KEY,
          'Content-Type': 'application/json',
          'X-Pinecone-Api-Version': '2025-01'
        },
        timeout: 30000
      }
    );
    
    if (!resp.data || !resp.data.data || !resp.data.data[0] || !resp.data.data[0].values) {
      console.error('Pinecone embed响应格式异常:', JSON.stringify(resp.data, null, 2));
      throw new Error('Pinecone embed响应格式异常');
    }
    
    return resp.data.data[0].values;
  } catch (error) {
    if (error.response) {
      console.error('Pinecone embed错误状态:', error.response.status);
      console.error('Pinecone embed错误详情:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Pinecone embed请求失败:', error.message);
    }
    throw error;
  }
}

async function queryPinecone(embedding, topK = 5) {
  const url = 'https://diabetes-rxfk5qs.svc.aped-4627-b74a.pinecone.io/query';
  
  console.log('Embedding维度:', embedding.length);
  console.log('Embedding前5个值:', embedding.slice(0, 5));
  
  const requestBody = {
    vector: embedding,
    topK: topK,
    includeMetadata: true,
  };
  
  // 如果namespace不为空才添加
  if (PINECONE_NAMESPACE && PINECONE_NAMESPACE !== '') {
    requestBody.namespace = PINECONE_NAMESPACE;
  }
  
  console.log('Pinecone请求体:', JSON.stringify(requestBody, null, 2));
  
  try {
    const resp = await axios.post(
      url,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': PINECONE_API_KEY,
        },
        timeout: 30000,
      }
    );
    
    return resp.data.matches || [];
  } catch (error) {
    if (error.response) {
      console.error('Pinecone错误状态:', error.response.status);
      console.error('Pinecone错误详情:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

exports.main = async (event, context) => {
  try {
    const question = (event && event.question ? String(event.question) : '').trim();
    if (!question) return { ok: false, error: 'question 不能为空' };

    const conversationHistory = (event && event.conversation_history) || [];

    const apiKey = 'sk-zk2a4da7eae076a209c44fef627ae30ef4768cd76cda7afc';
    const baseUrl = process.env.ZHIZENGZENG_BASE_URL || 'https://api.zhizengzeng.com/v1';
    if (!apiKey) return { ok: false, error: '未配置环境变量 ZHIZENGZENG_API_KEY' };

    const url = `${baseUrl}/chat/completions`;

    let contextText = '';
    try {
      const embedding = await getEmbedding(question);
      const matches = await queryPinecone(embedding, 5);
      
      if (matches.length > 0) {
        const references = matches
          .map((match, idx) => `(${idx + 1}) ${match.metadata?.text || match.metadata?.content || ''} (相似度: ${(match.score * 100).toFixed(1)}%)`)
          .filter(ref => ref.includes(':'))
          .join('\n\n');
        
        if (references) {
          contextText = `\n\n以下是从知识库中检索到的相关参考资料（按相似度排序）：\n${references}\n\n请基于以上参考资料回答用户问题。如果参考资料不足以回答问题，请明确说明。`;
        }
      }
    } catch (ragError) {
      console.error('RAG检索失败:', ragError.message);
    }

    const messages = [
      {
        role: 'system',
        content:
          '你是一个谨慎的 AI 医疗助手：提供一般性健康信息与就医建议，不做确诊；遇到急症风险先提示立即就医。' +
          (contextText ? contextText : ''),
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