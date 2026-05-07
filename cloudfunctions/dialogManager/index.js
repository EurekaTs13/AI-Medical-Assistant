const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库引用
const db = cloud.database();
const Dialog = db.collection('Dialog');  // 对话记录集合
const Turn = db.collection('Turn');      // 对话轮次集合

/**
 * 主入口函数
 * @param {Object} event - 前端传递的参数
 * @param {string} event.action - 操作类型
 * @param {Object} event.data - 操作数据
 * @param {Object} context - 云函数调用上下文
 */
exports.main = async (event, context) => {
  const { action } = event;
	let params = event.data || event; 
  try {
    switch (action) {
      case 'getDialogs':
        return await getDialogs(params);
      case 'getDialog':
        return await getDialog(params);
      case 'createDialog':
        return await createDialog(params);
      case 'updateDialog':
        return await updateDialog(params);
      case 'deleteDialog':
        return await deleteDialog(params);
      case 'getTurnsByDialogId':
        return await getTurnsByDialogId(params);
      case 'createTurn':
        return await createTurn(params);
      default:
        return { 
          ok: false, 
          error: '未知操作',
          code: 400
        };
    }
  } catch (error) {
    console.error('云函数操作失败:', error);
    return { 
      ok: false, 
      error: error.message || '操作失败',
      code: 500
    };
  }
};

/**
 * 获取用户的所有对话列表
 * @param {Object} data - 操作数据
 * @param {string} data.openid - 用户的微信openid
 * @returns {Object} 包含对话列表的结果对象
 */
async function getDialogs({ openid }) {
  // 验证必需参数
  if (!openid) {
    return { 
      ok: false, 
      error: '缺少openid参数',
      code: 400
    };
  }
  
  // 查询该用户的所有对话，按开始时间倒序排列
  const dialogs = await Dialog
    .where({ 
      openid: openid,           // 使用openid作为用户标识
      is_deleted: false         // 只查询未删除的对话
    })
    .orderBy('created_at', 'desc')  // 按创建时间倒序
    .get();
  
  return { 
    ok: true, 
    data: dialogs.data,
    code: 200
  };
}

/**
 * 获取单个对话详情
 * @param {Object} data - 操作数据
 * @param {string} data.dialogId - 对话ID
 * @returns {Object} 包含对话详情的结果对象
 */
async function getDialog({ dialogId }) {
  if (!dialogId) {
    return { 
      ok: false, 
      error: '缺少dialogId参数',
      code: 400
    };
  }
  
  const dialog = await Dialog.doc(dialogId).get();
  return { 
    ok: true, 
    data: dialog.data || null,
    code: 200
  };
}

/**
 * 创建新对话
 * @param {Object} data - 操作数据
 * @param {string} data.openid - 用户的微信openid
 * @param {string} data.title - 对话标题
 * @returns {Object} 包含新对话信息的结果对象
 */
async function createDialog({ openid, title = '新对话' }) {
  if (!openid) {
    return { 
      ok: false, 
      error: '缺少openid参数',
      code: 400
    };
  }
  
  // 创建对话对象
  const dialog = {
    _id: generateDialogId(),          // 生成唯一的对话ID
    openid: openid,                   // 使用openid作为用户标识
    title: title,                     // 对话标题
    message_count: 0,                 // 初始消息数为0
    status: 'active',                 // 对话状态：active-活跃
    is_deleted: false,                // 删除标记
    created_at: new Date(),           // 创建时间
    updated_at: new Date()            // 最后更新时间
  };
  
  // 插入到数据库
  const result = await Dialog.add({ data: dialog });
  return { 
    ok: true, 
    data: { ...dialog, _id: result._id },
    code: 201
  };
}

/**
 * 更新对话信息
 * @param {Object} data - 操作数据
 * @param {string} data.dialogId - 对话ID
 * @param {Object} data.updates - 要更新的字段
 * @returns {Object} 包含更新后对话信息的结果对象
 */
async function updateDialog({ dialogId, updates }) {
  if (!dialogId) {
    return { 
      ok: false, 
      error: '缺少dialogId参数',
      code: 400
    };
  }
  
  // 添加更新时间
  updates.updated_at = new Date();
  
  // 更新数据库记录
  await Dialog.doc(dialogId).update({ data: updates });
  
  // 获取更新后的对话
  const updatedDialog = await Dialog.doc(dialogId).get();
  return { 
    ok: true, 
    data: updatedDialog.data || null,
    code: 200
  };
}

/**
 * 删除对话（软删除）
 * @param {Object} data - 操作数据
 * @param {string} data.dialogId - 对话ID
 * @returns {Object} 删除结果
 */
async function deleteDialog({ dialogId }) {
  if (!dialogId) {
    return { 
      ok: false, 
      error: '缺少dialogId参数',
      code: 400
    };
  }
  
  // 软删除：标记为已删除
  await Dialog.doc(dialogId).update({
    data: {
      is_deleted: true,
      updated_at: new Date()
    }
  });
  
  return { 
    ok: true,
    code: 200
  };
}

/**
 * 获取指定对话的所有轮次
 * @param {Object} data - 操作数据
 * @param {string} data.dialogId - 对话ID
 * @returns {Object} 包含对话轮次列表的结果对象
 */
async function getTurnsByDialogId({ dialogId }) {
  if (!dialogId) {
    return { 
      ok: false, 
      error: '缺少dialogId参数',
      code: 400
    };
  }
  
  // 查询该对话的所有轮次，按轮次索引升序排列
  const turns = await Turn
    .where({ 
      dialog_id: dialogId,
      is_deleted: false
    })
    .orderBy('turn_index', 'asc')
    .get();
  
  return { 
    ok: true, 
    data: turns.data,
    code: 200
  };
}

/**
 * 创建对话轮次
 * @param {Object} data - 操作数据
 * @param {string} data.dialogId - 对话ID
 * @param {string} data.userInput - 用户输入
 * @param {string} data.aiResponse - AI响应
 * @returns {Object} 包含新轮次信息的结果对象
 */
async function createTurn({ dialogId, userInput, aiResponse }) {
  if (!dialogId || !userInput || !aiResponse) {
    return { 
      ok: false, 
      error: '缺少必需参数',
      code: 400
    };
  }
  
  // 获取对话信息，用于获取openid
  const dialog = await Dialog.doc(dialogId).get();
  if (!dialog.data) {
    return { 
      ok: false, 
      error: '对话不存在',
      code: 404
    };
  }
  
  // 获取当前对话的总轮次数
  const turnCountResult = await Turn
    .where({ dialog_id: dialogId })
    .count();
  const turnCount = turnCountResult.total || 0;
  
  // 创建轮次对象
  const turn = {
    _id: generateTurnId(dialogId, turnCount),  // 生成唯一的轮次ID
    dialog_id: dialogId,                        // 所属对话ID
    openid: dialog.data.openid,                 // 用户openid
    turn_index: turnCount,                      // 轮次索引
    user_input: userInput,                      // 用户输入
    ai_response: aiResponse,                    // AI响应
    is_deleted: false,                          // 删除标记
    created_at: new Date()                      // 创建时间
  };
  
  // 插入到数据库
  const result = await Turn.add({ data: turn });
  
  // 更新对话的消息数量和最后更新时间
  await Dialog.doc(dialogId).update({
    data: {
      message_count: turnCount + 1,
      updated_at: new Date()
    }
  });
  
  return { 
    ok: true, 
    data: { ...turn, _id: result._id },
    code: 201
  };
}

/**
 * 生成唯一的对话ID
 * @returns {string} 生成的对话ID
 */
function generateDialogId() {
  return 'dialog_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 生成唯一的轮次ID
 * @param {string} dialogId - 对话ID
 * @param {number} turnIndex - 轮次索引
 * @returns {string} 生成的轮次ID
 */
function generateTurnId(dialogId, turnIndex) {
  return `turn_${dialogId}_${turnIndex}_${Date.now().toString(36)}`;
}