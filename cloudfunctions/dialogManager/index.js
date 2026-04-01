const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const Dialog = db.collection('Dialog');
const Turn = db.collection('Turn');

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

exports.main = async (event, context) => {
  const { action, data } = event;
  
  try {
    switch (action) {
      case 'getDialogs':
        return await getDialogs(data);
      case 'getDialog':
        return await getDialog(data);
      case 'createDialog':
        return await createDialog(data);
      case 'updateDialog':
        return await updateDialog(data);
      case 'deleteDialog':
        return await deleteDialog(data);
      case 'getTurnsByDialogId':
        return await getTurnsByDialogId(data);
      case 'createTurn':
        return await createTurn(data);
      default:
        return { ok: false, error: '未知操作' };
    }
  } catch (error) {
    console.error('操作失败:', error);
    return { ok: false, error: error.message || '操作失败' };
  }
};

async function getDialogs({ userId }) {
  const dialogs = await Dialog
    .where({ user_id: userId })
    .orderBy('start_time', 'desc')
    .get();
  return { ok: true, data: dialogs.data };
}

async function getDialog({ dialogId }) {
  const dialog = await Dialog
    .doc(dialogId)
    .get();
  return { ok: true, data: dialog.data || null };
}

async function createDialog({ userId, title = '新对话' }) {
  const dialog = {
    user_id: userId,
    start_time: Date.now(),
    end_time: null,
    title: title,
    message_count: 0,
    status: 'active',
    created_at: new Date()
  };
  
  const result = await Dialog.add({ data: dialog });
  return { ok: true, data: { ...dialog, _id: result._id } };
}

async function updateDialog({ dialogId, updates }) {
  await Dialog
    .doc(dialogId)
    .update({ data: updates });
  
  const updatedDialog = await Dialog
    .doc(dialogId)
    .get();
  
  return { ok: true, data: updatedDialog.data || null };
}

async function deleteDialog({ dialogId }) {
  // 先删除相关的 Turn
  await Turn
    .where({ dialog_id: dialogId })
    .remove();
  
  // 再删除 Dialog
  await Dialog
    .doc(dialogId)
    .remove();
  
  return { ok: true };
}

async function getTurnsByDialogId({ dialogId }) {
  const turns = await Turn
    .where({ dialog_id: dialogId })
    .orderBy('turn_index', 'asc')
    .get();
  return { ok: true, data: turns.data };
}

async function createTurn({ userId, dialogId, turnIndex, userInput, aiOutput }) {
  const turn = {
    dialog_id: dialogId,
    user_id: userId,
    turn_index: turnIndex,
    user_input: userInput,
    user_timestamp: Date.now(),
    ai_output: aiOutput,
    ai_timestamp: Date.now(),
    created_at: new Date()
  };
  
  const result = await Turn.add({ data: turn });
  
  // 更新 Dialog 的 message_count 和 end_time
  const turnCount = await Turn
    .where({ dialog_id: dialogId })
    .count();
  
  await Dialog
    .doc(dialogId)
    .update({
      message_count: turnCount.total,
      end_time: Date.now()
    });
  
  return { ok: true, data: { ...turn, _id: result._id } };
}
