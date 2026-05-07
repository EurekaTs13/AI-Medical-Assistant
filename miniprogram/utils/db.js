const DB = {
  async getDialogs(userId) {
    const result = await wx.cloud.callFunction({
      name: 'dialogManager',
      data: {
        action: 'getDialogs',
        data: { userId }
      }
    });
    return result.result.ok ? result.result.data : [];
  },

  async getDialog(dialogId) {
    const result = await wx.cloud.callFunction({
      name: 'dialogManager',
      data: {
        action: 'getDialog',
        data: { dialogId }
      }
    });
    return result.result.ok ? result.result.data : null;
  },

  async createDialog(userId, title = '新对话') {
    const result = await wx.cloud.callFunction({
      name: 'dialogManager',
      data: {
        action: 'createDialog',
        data: { userId, title }
      }
    });
    return result.result.ok ? result.result.data : null;
  },

  async updateDialogTitle(dialogId, title) {
    const result = await wx.cloud.callFunction({
      name: 'dialogManager',
      data: {
        action: 'updateDialog',
        data: {
          dialogId,
          updates: { title: title.substring(0, 20) }
        }
      }
    });
    return result.result.ok ? result.result.data : null;
  },

  async deleteDialog(dialogId) {
    const result = await wx.cloud.callFunction({
      name: 'dialogManager',
      data: {
        action: 'deleteDialog',
        data: { dialogId }
      }
    });
    return result.result.ok;
  },

  async getTurnsByDialogId(dialogId) {
    const result = await wx.cloud.callFunction({
      name: 'dialogManager',
      data: {
        action: 'getTurnsByDialogId',
        data: { dialogId }
      }
    });
    return result.result.ok ? result.result.data : [];
  },

  async createTurn(userId, dialogId, turnIndex, userInput, aiOutput) {
    const result = await wx.cloud.callFunction({
      name: 'dialogManager',
      data: {
        action: 'createTurn',
        data: { userId, dialogId, turnIndex, userInput, aiOutput }
      }
    });
    return result.result.ok ? result.result.data : null;
  }
};

module.exports = DB;
