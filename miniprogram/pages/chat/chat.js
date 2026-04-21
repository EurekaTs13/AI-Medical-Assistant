// pages/chat/chat.js
//注意：上线前已关闭调试功能，开发环境下请在app.js文件开始处打开console的调试方法。
const app = getApp();

Page({
  /**
   * 页面数据定义
   */
  data: {
    // 输入相关
    text: '',
    canSend: false,
    composerFocused: false,
    
    // 加载状态
    loading: false,
    sending: false,
    
    // 消息数据
    messages: [],
    scrollToView: '',
    messageScrollTop: 0,
    
    // 用户信息
    userInfo: null,
    loginModalVisible: false,
    
    // 侧边栏
    sidebarOpen: false,
    sidebarWidth: 300,
    navBarStyle: {},
    centerPaddingTop: 100,
    
    // 对话管理
    currentDialogId: null,
    isNewDialog: true,
    turnIndex: 0,
    historyDialogs: [],
    
    // 用户信息编辑相关
    showProfileEdit: false,
    profileEditData: {
      nickname: '',
      avatarUrl: '',
      tempAvatarPath: ''
    },
    
    // 其他
    showSafetyTip: true,
    isGuestMode: true,
    streamTimeout: null
  },

  /**
   * 页面加载
   */
  onLoad: async function (e) {
    console.log('页面加载 - AI医疗助手');
    
    // 调整导航栏
    this.adjustNavBar();
    if(e.loadWithoutCheck){
      return;
    }
    // 检查登录状态，完成后执行回调
    await this.checkUserLoginStatus(() => {
      // 登录状态检查完成后执行
      this.loadHistoryDialogs();
      this.startNewChat();
    });
  },

  /**
   * 检查用户登录状态
   */
  checkUserLoginStatus: function () {
    return new Promise((resolve, reject) => {
      const that = this;
      const app = getApp();
      wx.showLoading({
        title: '正在查找记录',
        mask: true
      })
      wx.cloud.callFunction({
        name: 'checkUser'
      }).then(res => {
        wx.hideLoading()
        app.globalData.openid = res.result.openid; // 在全局变量中设置openid
        
        if (!res.result.exists) { // 若用户不存在于数据库
          that.setData({
            isGuestMode: true
          }); // 进入游客模式

          wx.showToast({
            title: '当前未登录',
            icon:'none'
          })
          console.log("用户不存在，openid为" + app.globalData.openid);
        } else {
          that.generateToken(); // 在全局中设置token
  
          let userInfo = {
            nickname: res.result.userRecord.nickname,
            avatarUrl: res.result.userRecord.avatar_url
          };

          app.globalData.userInfo = userInfo;
          
          that.setData({
            userInfo: userInfo,
            isGuestMode: false,
            loginModalVisible: false,
            showProfileEdit: false
          });

          wx.showToast({
            title: '欢迎回来',
            icon:'none'
          })
        }
        
        resolve(res.result); // 解析Promise

        this.loadHistoryDialogs();
      }).catch(err => {
        console.error('检查用户登录状态失败:', err);
        that.setData({ isGuestMode: true });
        reject(err); // 拒绝Promise
      });
    });
  },

  /**
   * 加载历史对话
   */
  loadHistoryDialogs: function () {
    console.log("开始加载历史对话");
    const that = this;
    
    // 游客模式下不加载历史对话
    if (this.data.isGuestMode || !app.globalData.openid) {
      console.log('游客模式或未登录，不加载历史对话');
      return;
    }
    
    wx.cloud.callFunction({
      name: 'dialogManager', // 使用第三个云函数
      data: {
        action: 'getDialogs',
        openid: app.globalData.openid
      }
    }).then(res => {
      console.log('获取历史对话成功:', res.result);
      
      if (res.result.code === 200 && res.result.data) {
        const dialogs = res.result.data.map(dialog => ({
          ...dialog,
          formattedTime: that.formatTime(dialog.updated_at)
        }));
        
        that.setData({
          historyDialogs: dialogs
        });
      }
    }).catch(err => {
      console.error('获取历史对话失败:', err);
    });
  },

  /**
   * 调整导航栏位置
   */
  adjustNavBar: function () {
    var systemInfo = wx.getSystemInfoSync();
    
    // 简化导航栏样式计算
    var navBarStyle = {
      top: '0',
      right: '0',
      height: '80rpx',
      lineHeight: '80rpx'
    };
    
    this.setData({
      navBarStyle: navBarStyle,
      centerPaddingTop: 100
    });
  },

  /**
   * 切换侧边栏
   */
  toggleSidebar: function () {
    var sidebarOpen = !this.data.sidebarOpen;
    this.setData({ sidebarOpen: sidebarOpen });
    
    // 侧边栏打开时刷新历史对话
    if (sidebarOpen && !this.data.isGuestMode) {
      this.loadHistoryDialogs();
    }
  },

  /**
   * 打开历史对话
   */
  openHistoryDialog: function (e) {
    const dialogId = e.currentTarget.dataset.dialogId;
    const that = this;
    
    if (!dialogId) {
      wx.showToast({
        title: '对话ID不存在',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    // 1. 获取对话详情
    wx.cloud.callFunction({
      name: 'dialogManager',
      data: {
        action: 'getDialog',
        dialogId: dialogId
      }
    }).then(res => {
      if (res.result.code !== 200) {
        throw new Error('获取对话失败');
      }
      
      const dialog = res.result.data;
      
      // 2. 获取该对话的所有轮次
      return wx.cloud.callFunction({
        name: 'dialogManager',
        data: {
          action: 'getTurnsByDialogId',
          dialogId: dialogId
        }
      }).then(turnsRes => {
        if (turnsRes.result.code !== 200) {
          throw new Error('获取对话轮次失败');
        }
        
        // 将对话轮次转换为消息格式
        const messages = turnsRes.result.data.map(turn => {
          return [
            {
              type: 'user',
              content: turn.user_input,
              time: that.formatTimeToHourMinute(turn.created_at)
            },
            {
              type: 'ai',
              content: turn.ai_response,
              displayContent: turn.ai_response,
              streaming: false,
              time: that.formatTimeToHourMinute(turn.created_at)
            }
          ];
        }).flat();
        
        // 更新页面状态
        that.setData({
          currentDialogId: dialogId,
          isNewDialog: false,
          messages: messages,
          sidebarOpen: false
        });
        
        // 滚动到底部
        that.scrollToBottom(messages.length - 1);
        
        wx.hideLoading();
        wx.showToast({
          title: '对话已加载',
          icon: 'success',
          duration: 1500
        });
      });
    }).catch(err => {
      console.error('打开历史对话失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '加载对话失败',
        icon: 'none',
        duration: 2000
      });
    });
  },

  /**
   * 删除历史对话
   */
  deleteHistoryDialog: function (e) {
    const that = this;
    const dialogId = e.currentTarget.dataset.dialogId;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条对话记录吗？删除后不可恢复',
      confirmText: '删除',
      confirmColor: '#ff4444',
      success: function (res) {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中...',
            mask: true
          });
          
          wx.cloud.callFunction({
            name: 'dialogManager',
            data: {
              action: 'deleteDialog',
              dialogId: dialogId
            }
          }).then(result => {
            wx.hideLoading();
            
            if (result.result.code === 200) {
              // 从本地数据中移除
              const newHistoryDialogs = that.data.historyDialogs.filter(
                dialog => dialog._id !== dialogId
              );
              
              that.setData({
                historyDialogs: newHistoryDialogs
              });
              
              // 如果删除的是当前对话，清空消息
              if (that.data.currentDialogId === dialogId) {
                that.setData({
                  currentDialogId: null,
                  messages: [],
                  isNewDialog: true
                });
              }
              
              wx.showToast({
                title: '删除成功',
                icon: 'success',
                duration: 1500
              });
            } else {
              wx.showToast({
                title: '删除失败',
                icon: 'none',
                duration: 2000
              });
            }
          }).catch(err => {
            wx.hideLoading();
            console.error('删除对话失败:', err);
            wx.showToast({
              title: '删除失败',
              icon: 'none',
              duration: 2000
            });
          });
        }
      }
    });
    
    e.stopPropagation(); // 阻止事件冒泡
  },

  /**
   * 导航到设置页面
   */
  navigateToSettings: function () {
    var app = getApp();
    
    if (!app.globalData.token) {
      this.showLoginModal('请先登录后再进行设置');
      return;
    }
    
    this.setData({ sidebarOpen: false });
    
    setTimeout(function () {
      wx.navigateTo({
        url: '/pages/settings/settings',
        fail: function (err) {
          console.error('导航失败:', err);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        }
      });
    }, 300);
  },

  /**
   * 输入框内容变化
   */
  onInput: function (e) {
    var text = (e.detail.value || '').trimStart();
    var canSend = (text.replace(/\s+/g, '').length > 0);
    
    this.setData({
      text: text,
      canSend: canSend
    });
  },

  /**
   * 发送消息
   */
  onSend: function () {
    var that = this;
    var question = (this.data.text || '').trim();
    
    if (!question) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    if (this.data.loading || this.data.sending) {
      wx.showToast({
        title: '请等待回复完成',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 检查登录状态
    if (!app.globalData.token && !this.data.isGuestMode) {
      this.showLoginModal('登录后可使用完整功能');
      return;
    }
    
    this.setData({
      text: '',
      canSend: false,
      loading: true,
      sending: true
    });
    
    // 添加用户消息
    var userMessage = {
      type: 'user',
      content: question,
      time: this.getCurrentTime()
    };
    
    var newMessages = this.data.messages.concat(userMessage);
    this.setData({ messages: newMessages });
    
    // 滚动到底部
    this.scrollToBottom(newMessages.length - 1);
    
    // 准备AI消息
    var aiMessage = {
      type: 'ai',
      content: '',
      displayContent: '',
      streaming: true,
      time: this.getCurrentTime()
    };
    
    var messagesWithAI = newMessages.concat(aiMessage);
    this.setData({ messages: messagesWithAI });
    
    // 游客模式处理
    if (this.data.isGuestMode) {
      this.simulateGuestResponse(question, messagesWithAI.length - 1);
      return;
    }
    
    // 调用真正的AI医疗助手云函数
    this.callAIMedicalAssistant(question, messagesWithAI.length - 1);
  },

  /**
   * 调用AI医疗助手云函数 - 已修改为符合智增增API格式
   */
  callAIMedicalAssistant: async function (question, messageIndex) {
    const that = this;
    const messages = this.data.messages.slice();
    const aiMessage = messages[messageIndex];
    
    try {
      // 构建对话历史上下文 - 格式必须符合云函数期望
      let conversationHistory = [];
      
      if (!this.data.isNewDialog && this.data.currentDialogId) {
        // 如果不是新对话且有当前对话ID，从数据库获取历史对话轮次
        try {
          const turnsResult = await wx.cloud.callFunction({
            name: 'dialogManager',
            data: {
              action: 'getTurnsByDialogId',
              dialogId: this.data.currentDialogId
            }
          });
          
          console.log('获取历史轮次结果:', turnsResult);
          
          if (turnsResult.result.code === 200 && turnsResult.result.data) {
            // 从数据库获取的历史轮次
            const dbTurns = turnsResult.result.data;
            
            // 重要：按照云函数期望的格式构建 conversation_history
            // 格式: [{ user_input: "...", ai_output: "..." }, ...]
            for (let i = 0; i < dbTurns.length; i++) {
              const turn = dbTurns[i];
              if (turn.user_input && turn.ai_response) {
                conversationHistory.push({
                  user_input: turn.user_input,
                  ai_output: turn.ai_response
                });
              }
            }
            
            console.log('从数据库构建的对话历史:', conversationHistory);
          }
        } catch (error) {
          console.error('从数据库获取历史对话失败:', error);
        }
      } else if (this.data.messages.length > 0) {
        // 如果是当前页面的消息历史（适用于新对话但已有交互的情况）
        // 从当前消息数组中提取历史对话，但不包括本次的提问
        const historyMessages = this.data.messages.slice(0, -1);
        
        // 将页面消息转换为云函数期望的格式
        // 页面消息格式: [{type: 'user', content: '...'}, {type: 'ai', content: '...'}]
        for (let i = 0; i < historyMessages.length; i += 2) {
          const userMessage = historyMessages[i];
          const aiMessage = historyMessages[i + 1];
          
          if (userMessage && aiMessage && 
              userMessage.type === 'user' && 
              aiMessage.type === 'ai' &&
              userMessage.content && aiMessage.content) {
            conversationHistory.push({
              user_input: userMessage.content,
              ai_output: aiMessage.content
            });
          }
        }
        
        console.log('从页面消息构建的对话历史:', conversationHistory);
      }
      
      console.log('最终发送的 conversation_history:', JSON.stringify(conversationHistory, null, 2));
      
      // 调用AI云函数
      const aiResponse = await wx.cloud.callFunction({
        name: 'askLLM',
        data: { 
          question: question,
          conversation_history: conversationHistory
        }
      });
      
      console.log('AI医疗助手响应:', aiResponse);
      
      if (aiResponse.result && aiResponse.result.answer) {
        const answer = aiResponse.result.answer;
        aiMessage.content = answer;
        
        // 如果是新对话，先创建对话记录
        if (that.data.isNewDialog && that.data.currentDialogId === null) {
          that.createNewDialog(question, answer, messageIndex);
        } else {
          // 保存对话轮次
          that.saveDialogTurn(question, answer, messageIndex);
        }
        
        // 流式显示AI回复
        that.startStreamingDisplay(answer, messageIndex, function () {
          aiMessage.streaming = false;
          aiMessage.displayContent = answer;
          
          that.setData({
            messages: messages,
            loading: false,
            sending: false
          });
          
          that.scrollToBottom(messageIndex);
        });
      } else if (aiResponse.result && aiResponse.result.error) {
        // 如果云函数返回错误
        console.error('AI云函数错误:', aiResponse.result.error);
        throw new Error(`AI服务错误: ${aiResponse.result.error}`);
      } else {
        throw new Error('AI响应格式错误');
      }
    } catch (err) {
      console.error('调用AI医疗助手失败:', err);
      
      // 显示错误信息
      aiMessage.content = '抱歉，AI助手暂时无法响应，请稍后重试。错误: ' + err.message;
      aiMessage.displayContent = aiMessage.content;
      aiMessage.streaming = false;
      
      that.setData({
        messages: messages,
        loading: false,
        sending: false
      });
      
      that.scrollToBottom(messageIndex);
    }
  },

  /**
   * 创建新对话
   */
  createNewDialog: function (firstQuestion, firstAnswer, messageIndex) {
    const that = this;
    
    // 1. 先调用标题生成云函数
    wx.cloud.callFunction({
      name: 'generateTitle', // 使用第一个云函数
      data: {
        userInput: firstQuestion
      }
    }).then(titleRes => {
      console.log('标题生成响应:', titleRes);
      
      let title = 'AI医疗咨询';
      if (titleRes.result && titleRes.result.title) {
        title = titleRes.result.title;
      }
      
      // 2. 创建对话记录
      return wx.cloud.callFunction({
        name: 'dialogManager',
        data: {
          action: 'createDialog',
          openid: app.globalData.openid,
          title: title
        }
      });
    }).then(dialogRes => {
      console.log('对话创建响应:', dialogRes);
      
      if (dialogRes.result.code === 201 && dialogRes.result.data && dialogRes.result.data._id) {
        const dialogId = dialogRes.result.data._id;
        
        // 3. 创建第一个对话轮次
        return wx.cloud.callFunction({
          name: 'dialogManager',
          data: {
            action: 'createTurn',
            dialogId: dialogId,
            userInput: firstQuestion,
            aiResponse: that.data.messages[messageIndex].content
          }
        }).then(turnRes => {
          console.log('对话轮次创建响应:', turnRes);
          
          if (turnRes.result.code === 201) {
            // 更新页面状态
            that.setData({
              currentDialogId: dialogId,
              isNewDialog: false
            });
            
            // 将新对话添加到历史对话列表
            const newDialog = {
              _id: dialogId,
              title: firstQuestion.length > 20 ? firstQuestion.substring(0, 20) + '...' : firstQuestion,
              user_id: app.globalData.openid,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              message_count: 1,
              is_deleted: false,
              formattedTime: that.getCurrentTime()
            };
            
            that.setData({
              historyDialogs: [newDialog, ...that.data.historyDialogs]
            });
          }
        });
      }
    }).catch(err => {
      console.error('创建对话或轮次失败:', err);
      // 即使失败也不影响用户继续聊天
    });
  },

  /**
   * 保存对话轮次
   */
  saveDialogTurn: function (userInput, aiResponse, messageIndex) {
    const that = this;
    const dialogId = this.data.currentDialogId;
    
    if (!dialogId) {
      console.warn('对话ID不存在，无法保存轮次');
      return;
    }
    
    wx.cloud.callFunction({
      name: 'dialogManager',
      data: {
        action: 'createTurn',
        dialogId: dialogId,
        userInput: userInput,
        aiResponse: aiResponse
      }
    }).then(res => {
      console.log('保存对话轮次成功:', res);
      
      if (res.result.code === 201) {
        // 更新对应对话的最后更新时间
        const updatedDialogs = that.data.historyDialogs.map(dialog => {
          if (dialog._id === dialogId) {
            return {
              ...dialog,
              updated_at: new Date().toISOString(),
              formattedTime: that.getCurrentTime()
            };
          }
          return dialog;
        });
        
        that.setData({
          historyDialogs: updatedDialogs
        });
      }
    }).catch(err => {
      console.error('保存对话轮次失败:', err);
    });
  },

  /**
   * 开始流式显示
   */
  startStreamingDisplay: function (content, messageIndex, onComplete) {
    var that = this;
    var messages = this.data.messages.slice();
    var aiMessage = messages[messageIndex];
    
    var index = 0;
    var totalLength = content.length;
    var chunkSize = 2;
    var interval = 40;
    
    if (this.data.streamTimeout) {
      clearTimeout(this.data.streamTimeout);
    }
    
    function showNextChunk() {
      if (index >= totalLength) {
        aiMessage.streaming = false;
        that.setData({
          messages: messages,
          streamTimeout: null
        });
        
        if (onComplete) {
          onComplete();
        }
        return;
      }
      
      var end = Math.min(index + chunkSize, totalLength);
      aiMessage.displayContent = content.substring(0, end);
      
      that.setData({ messages: messages });
      index = end;
      that.data.streamTimeout = setTimeout(showNextChunk, interval);
    }
    
    showNextChunk();
  },

  /**
   * 模拟游客响应
   */
  simulateGuestResponse: function (question, messageIndex) {
    var that = this;
    var messages = this.data.messages.slice();
    var aiMessage = messages[messageIndex];
    
    var response = "您好！欢迎使用AI医疗助手。当前为游客模式，登录后可享受完整服务，包括保存历史对话、个性化健康建议等。";
    
    aiMessage.content = response;
    
    // 显示登录提示
    setTimeout(function () {
      wx.showModal({
        title: '游客模式提示',
        content: '登录后可使用完整功能，包括保存历史对话、个性化建议等。',
        confirmText: '去登录',
        cancelText: '继续使用',
        success: function (res) {
          if (res.confirm) {
            that.showLoginModal('登录后可使用完整功能');
          }
        }
      });
    }, 800);
    
    this.startStreamingDisplay(response, messageIndex, function () {
      aiMessage.streaming = false;
      aiMessage.displayContent = response;
      
      that.setData({
        messages: messages,
        loading: false,
        sending: false
      });
      
      that.scrollToBottom(messageIndex);
    });
  },

  /**
   * 显示登录模态框
   */
  showLoginModal: function (message) {
    this.setData({
      loginModalVisible: true
    });
  },

  /**
   * 隐藏登录模态框
   */
  hideLoginModal: function () {
    this.setData({
      loginModalVisible: false
    });
  },

  /**
   * 微信登录 - 显示个人信息编辑弹窗
   */
  onWechatLogin:async function () {
    var that = this;
    await this.checkUserLoginStatus();
    if(app.globalData.token){
      return;
    }
    // 显示底部弹窗
    wx.showModal({
      title: '完善个人信息',
      content: '请设置您的头像和昵称，这将用于个性化显示',
      showCancel: true,
      cancelText: '取消',
      confirmText: '开始设置',
      success: function (res) {
        if (res.confirm) {
          // 用户点击开始设置
          that.setData({
            showProfileEdit: true,
            profileEditData: {
              nickname: '',
              avatarUrl: '',
              tempAvatarPath: ''
            }
          });
        }
      }
    });
  },

  /**
   * 选择头像 - 通过button的bindchooseavatar事件
   */
  onChooseAvatar: function (e) {
    console.log('选择头像事件触发:', e);
    
    // 获取头像临时路径
    var avatarPath = e.detail.avatarUrl;
    console.log('获取到头像路径:', avatarPath);
    
    this.setData({
      'profileEditData.tempAvatarPath': avatarPath,
      'profileEditData.avatarUrl': avatarPath
    });
    
    // 显示成功提示
    wx.showToast({
      title: '头像选择成功',
      icon: 'success',
      duration: 1500
    });
  },

  /**
   * 处理昵称输入
   */
  onNicknameInput: function (e) {
    var value = e.detail.value;
    this.setData({
      'profileEditData.nickname': value
    });
  },

  /**
   * 点击确认按钮，上传头像和昵称
   */
  submitUserInfo: function() {
    var that = this;
    var profileData = this.data.profileEditData;
    
    // 验证输入
    if (!profileData.nickname || profileData.nickname.trim() === '') {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    if (!profileData.tempAvatarPath) {
      wx.showToast({
        title: '请选择头像',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 昵称长度限制
    var nickname = profileData.nickname.trim();
    if (nickname.length < 1 || nickname.length > 8) {
      wx.showToast({
        title: '昵称长度需为1-8个字符',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 显示加载状态
    wx.showLoading({ 
      title: '上传中...', 
      mask: true 
    });
    
    // 1. 上传头像到云存储
    wx.cloud.uploadFile({
      cloudPath: `UserProfilePicture/${app.globalData.openid}.jpeg`,
      filePath: profileData.tempAvatarPath
    })
    .then(function(uploadResult) {
      console.log('头像上传成功:', uploadResult);
      
      // 2. 获取临时文件URL
      return wx.cloud.getTempFileURL({
        fileList: [uploadResult.fileID]
      });
    })
    .then(function(tempFileRes) {
      // 3. 准备用户信息数据
      var userData = {
        nickname: nickname,
        avatar_url: `cloud://cloud1-8gqij1hff49654b7.636c-cloud1-8gqij1hff49654b7-1407339143/UserProfilePicture/${app.globalData.openid}.jpeg`,
      };
      
      // 4. 调用createUser云函数保存用户信息到数据库
      return wx.cloud.callFunction({
        name: 'createUser',
        data: {
          userData: userData
        }
      });
    })
    .then(res=> {
      console.log(res);
      const code = res.result.code
      if (code == 201) {
        // 创建用户成功
        // 5. 更新全局状态
        this.generateToken();
      
        // 6. 保存到本地存储
        try {
          wx.setStorageSync('userToken', app.globalData.token);
          wx.setStorageSync('openid', app.globalData.openid);
        } catch (e) {
          console.error('保存到本地存储失败:', e);
        }

        let userInfo = {
          nickname: nickname,
          avatarUrl: `cloud://cloud1-8gqij1hff49654b7.636c-cloud1-8gqij1hff49654b7-1407339143/UserProfilePicture/${app.globalData.openid}.jpeg`,
        }
        
        // 7. 更新页面状态
        that.setData({
          userInfo: userInfo,
          isGuestMode: false,
          loginModalVisible: false,
          showProfileEdit: false
        });
        app.globalData.userInfo = userInfo;
        
        // 8. 加载历史对话
        that.loadHistoryDialogs();
        
        wx.hideLoading();
        
        wx.showToast({
          title: '注册成功',
          icon: 'success',
          duration: 2000
        });
        
        console.log('用户信息保存完成:', userInfo);
        
      } else {
        // 创建用户失败
        wx.hideLoading();
        
        wx.showToast({
          title: code,
          icon: 'none',
          duration: 2000
        });
        
        // 如果是用户已存在，可以考虑更新用户信息
        if (code == 200) {
          console.log('用户已存在，尝试更新信息...');
          // 可以在这里调用updateUser云函数
        }
      }
    })
    .catch(function(err) {
      console.error('上传或保存失败:', err);
      wx.hideLoading();
      
      var errorMsg = '保存失败，请重试';
      if (err.errCode === -502001) {
        errorMsg = '网络异常，请检查网络连接';
      } else if (err.errMsg && err.errMsg.includes('cloud init')) {
        errorMsg = '云开发未初始化';
      } else if (err.errMsg && err.errMsg.includes('FunctionName')) {
        errorMsg = '云函数createUser不存在，请先部署';
      }
      
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 3000
      });
    });
  },

  /**
   * 关闭编辑弹窗
   */
  closeProfileEdit: function () {
    this.setData({
      showProfileEdit: false
    });
  },

  /**
   * 手机号登录
   */
  onPhoneLogin: function () {
    wx.showToast({
      title: '手机号登录功能开发中',
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 游客继续
   */
  continueAsGuest: function () {
    this.setData({
      loginModalVisible: false,
      isGuestMode: true
    });
    
    wx.showToast({
      title: '已切换为游客模式',
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 开始新对话
   */
  startNewChat: function () {
    if (this.data.streamTimeout) {
      clearTimeout(this.data.streamTimeout);
    }
    
    this.setData({
      messages: [],
      text: '',
      canSend: false,
      currentDialogId: null,
      isNewDialog: true,
      sidebarOpen: false,
      loading: false,
      sending: false
    });
  },

  /**
   * 使用示例
   */
  useExample: function (e) {
    var example = e.currentTarget.dataset.example;
    
    this.setData({
      text: example,
      canSend: true
    });
  },

  /**
   * 消息滚动事件
   */
  onMessageScroll: function (e) {
    this.setData({
      messageScrollTop: e.detail.scrollTop
    });
  },

  /**
   * 滚动到底部
   */
  scrollToBottom: function (index) {
    var that = this;
    setTimeout(function () {
      that.setData({
        scrollToView: 'message-' + index
      });
    }, 100);
  },

  /**
   * 获取当前时间
   */
  getCurrentTime: function () {
    var now = new Date();
    var hours = now.getHours().toString().padStart(2, '0');
    var minutes = now.getMinutes().toString().padStart(2, '0');
    return hours + ':' + minutes;
  },

  /**
   * 格式化时间
   */
  formatTime: function (dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
      return '刚刚';
    } else if (diffMins < 60) {
      return `${diffMins}分钟前`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)}小时前`;
    } else {
      return date.toLocaleDateString('zh-CN', { 
        month: 'numeric', 
        day: 'numeric' 
      });
    }
  },

  /**
   * 格式化时间为时分
   */
  formatTimeToHourMinute: function (dateString) {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return hours + ':' + minutes;
  },

  /**
   * 页面显示
   */
  onShow: function () {
    // 页面显示时，如果是登录状态，刷新历史对话
    if (app.globalData.token && !this.data.isGuestMode) {
      this.loadHistoryDialogs();
    }
  },

  /**
   * 页面卸载
   */
  onUnload: function () {
    if (this.data.streamTimeout) {
      clearTimeout(this.data.streamTimeout);
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh: function () {
    var that = this;
    
    // 刷新历史对话
    this.loadHistoryDialogs();
    
    setTimeout(function () {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  /**
   * 分享功能
   */
  onShareAppMessage: function () {
    return {
      title: 'AI医疗助手 - 专业的健康咨询伙伴',
      path: '/pages/chat/chat'
    };
  },

  /**
   * 统一生成token
   */
  generateToken: function () {
    if(!app.globalData.openid) { // 全局中没有openid，返回false
      return false;
    } else {
      app.globalData.token = app.globalData.openid + "_" + Date.now();
      return true;
    }
  }
});