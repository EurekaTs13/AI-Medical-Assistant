const DB = require('../../utils/db.js');

Page({
  data: {
    text: '',
    canSend: false,
    loading: false,
    messages: [],
    scrollToView: '',
    userInfo: null,
    navBarStyle: {},
    sidebarOpen: false,
    sidebarWidth: 0,
    centerPaddingTop: 0,
    messageScrollTop: 0,
    currentDialogId: null,
    isNewDialog: true,
    turnIndex: 0,
    historyDialogs: [],
    sidebarHeaderHeight: 0,
    loginModalVisible: false
  },

  onLoad: function () {
    this.adjustNavBar();
    
    const systemInfo = wx.getSystemInfoSync();
    const sidebarWidth = systemInfo.windowWidth * 5 / 6;
    this.setData({
      sidebarWidth: sidebarWidth
    });
    
    const app = getApp();
    if (app.globalData.token) {
      this.setData({
        userInfo: app.globalData.userInfo
      });
      this.loadHistoryDialogs();
    }
    
    this.startNewChat();
  },

  formatTimestamp: function (timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    
    if (diff < oneDay) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } else if (diff < oneWeek) {
      const days = ['日', '一', '二', '三', '四', '五', '六'];
      return `周${days[date.getDay()]}`;
    } else {
      const month = (date.getMonth() + 1).toString();
      const day = date.getDate().toString();
      return `${month}/${day}`;
    }
  },

  async loadHistoryDialogs() {
    try {
      const app = getApp();
      const userId = app.globalData.userInfo ? app.globalData.userInfo._id : '';
      const historyDialogs = await DB.getDialogs(userId);
      
      const formattedDialogs = historyDialogs.map(dialog => ({
        ...dialog,
        formattedTime: this.formatTimestamp(dialog.start_time)
      }));
      
      this.setData({ historyDialogs: formattedDialogs });
    } catch (error) {
      console.error('加载历史对话失败:', error);
      this.setData({ historyDialogs: [] });
    }
  },

  // 切换侧边栏
  toggleSidebar: function () {
    this.setData({
      sidebarOpen: !this.data.sidebarOpen
    });
  },

  // 导航至设置页面
  navigateToSettings: function () {
    const app = getApp();
    if (!app.globalData.token) {
      this.showLoginModal();
      return;
    }
    // 直接导航至设置页面，不关闭侧边栏
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  // 调整导航栏位置
  adjustNavBar: function () {
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    const systemInfo = wx.getSystemInfoSync();
    
    // 计算导航栏样式
    const navBarStyle = {
      top: `${menuButtonInfo.top}px`,
      right: `${systemInfo.windowWidth - menuButtonInfo.right + 10}px`,
      height: `${menuButtonInfo.height}px`,
      lineHeight: `${menuButtonInfo.height}px`
    };
    
    // 计算中间区域的顶部padding（导航栏总高度）
    const centerPaddingTop = menuButtonInfo.top + menuButtonInfo.height + 20;
    
    this.setData({
      navBarStyle: navBarStyle,
      centerPaddingTop: centerPaddingTop,
      sidebarHeaderHeight: menuButtonInfo.height
    });
  },

  onInput: function (e) {
    var text = (e.detail.value || '');
    while (text.length > 0 && text[0] === ' ') text = text.slice(1);

    this.setData({
      text: text,
      canSend: (text.replace(/\s+/g, '').length > 0),
    });
  },

  async onSend() {
    var that = this;
    var question = (this.data.text || '').replace(/^\s+|\s+$/g, '');

    if (!question || this.data.loading) return;

    const app = getApp();
    if (!app.globalData.token) {
      this.showLoginModal();
      return;
    }

    const userId = app.globalData.userInfo ? app.globalData.userInfo._id : '';

    this.setData({
      text: '',
      canSend: false,
      loading: true,
    });

    const newMessages = [...this.data.messages, { type: 'user', content: question }];
    this.setData({
      messages: newMessages
    });

    this.scrollToBottom(newMessages.length - 1);

    const userInputForTitle = question;

    let conversationHistory = [];
    if (!this.data.isNewDialog && this.data.currentDialogId) {
      try {
        const turns = await DB.getTurnsByDialogId(this.data.currentDialogId);
        turns.forEach(turn => {
          conversationHistory.push({
            user_input: turn.user_input,
            ai_output: turn.ai_output
          });
        });
      } catch (error) {
        console.error('获取历史对话失败:', error);
      }
    }

    wx.cloud.callFunction({
      name: 'askLLM',
      data: { 
        question: question,
        conversation_history: conversationHistory
      },
      success: async function (res) {
        var result = res && res.result ? res.result : null;

        if (!result || !result.ok) {
          var errMsg = (result && result.error) ? result.error : '云函数返回异常';
          that.setData({ loading: false });
          wx.showToast({ title: errMsg, icon: 'none' });
          return;
        }

        const aiAnswer = result.answer || '(空回答)';
        const updatedMessages = [...that.data.messages, { type: 'ai', content: aiAnswer }];
        
        that.setData({
          messages: updatedMessages,
          loading: false,
        });
        
        const newTurnIndex = that.data.turnIndex + 1;
        that.setData({ turnIndex: newTurnIndex });

        try {
          if (that.data.isNewDialog) {
            const dialog = await DB.createDialog(userId);
            that.setData({
              currentDialogId: dialog._id,
              isNewDialog: false
            });
            
            await DB.createTurn(userId, dialog._id, newTurnIndex, question, aiAnswer);
            
            that.generateAndSetDialogTitle(dialog._id, userInputForTitle);
          } else {
            await DB.createTurn(userId, that.data.currentDialogId, newTurnIndex, question, aiAnswer);
          }

          that.loadHistoryDialogs();
          that.scrollToBottom(updatedMessages.length - 1);
        } catch (error) {
          console.error('保存对话失败:', error);
          wx.showToast({ title: '保存对话失败', icon: 'none' });
        }
      },
      fail: function (err) {
        that.setData({ loading: false });
        wx.showToast({
          title: (err && err.errMsg) ? err.errMsg : '请求失败',
          icon: 'none',
        });
      }
    });
  },

  generateAndSetDialogTitle: function (dialogId, userInput) {
    const that = this;
    wx.cloud.callFunction({
      name: 'generateTitle',
      data: { userInput: userInput },
      success: async function (res) {
        var result = res && res.result ? res.result : null;
        if (result && result.ok) {
          await DB.updateDialogTitle(dialogId, result.title);
          that.loadHistoryDialogs();
        }
      },
      fail: async function (err) {
        const title = userInput.substring(0, 20);
        await DB.updateDialogTitle(dialogId, title);
        that.loadHistoryDialogs();
      }
    });
  },

  // 退出登录
  onLogout: function () {
    const that = this;
    
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: function (res) {
        if (res.confirm) {
          const app = getApp();
          app.logout();
        }
      }
    });
  },
  
  // 显示登录弹窗
  showLoginModal: function () {
    this.setData({
      loginModalVisible: true
    });
  },
  
  // 隐藏登录弹窗
  hideLoginModal: function () {
    this.setData({
      loginModalVisible: false
    });
  },
  
  // 微信登录（暂未实现）
  onWechatLogin: function () {
    console.log('微信登录功能暂未实现');
  },
  
  // 开始新对话
  startNewChat: function () {
    this.setData({
      messages: [],
      text: '',
      canSend: false,
      currentDialogId: null,
      isNewDialog: true,
      turnIndex: 0,
      sidebarOpen: false
    });
  },

  async openHistoryDialog(e) {
    try {
      const dialogId = e.currentTarget.dataset.dialogId;
      const dialog = await DB.getDialog(dialogId);
      
      if (!dialog) {
        wx.showToast({ title: '对话不存在', icon: 'none' });
        return;
      }

      const turns = await DB.getTurnsByDialogId(dialogId);
      const messages = [];
      turns.forEach(turn => {
        messages.push({ type: 'user', content: turn.user_input });
        messages.push({ type: 'ai', content: turn.ai_output });
      });

      this.setData({
        currentDialogId: dialogId,
        isNewDialog: false,
        turnIndex: turns.length,
        messages: messages,
        sidebarOpen: false
      });

      this.scrollToBottom(messages.length - 1);
    } catch (error) {
      console.error('加载对话失败:', error);
      wx.showToast({ title: '加载对话失败', icon: 'none' });
    }
  },
  
  // 滚动到底部
  scrollToBottom: function (index) {
    // 第一次清除scrollToView，确保下次可以正确触发
    this.setData({
      scrollToView: ''
    });
    
    // 使用setTimeout确保DOM更新完成后再滚动
    setTimeout(() => {
      this.setData({
        scrollToView: 'message-' + index
      });
    }, 100);
  },
});
