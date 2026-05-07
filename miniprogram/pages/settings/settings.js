// pages/settings/settings.js
Page({
  data: {
    userInfo: null,
    theme: 'light',
    language: 'zh_CN',
    version: '1.0.0',
    showDeleteConfirm: false,
    modalAnimation: {}
  },

  onLoad: function () {
    // 获取用户信息
    this.getUserInfo();
    
    // 获取应用配置
    this.getAppConfig();
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: '设置'
    });
  },

  onShow: function () {
    // 页面显示时重新获取用户信息
    this.getUserInfo();
  },

  // 获取用户信息
  getUserInfo: function () {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    
    this.setData({
      userInfo: userInfo
    });
  },

  // 获取应用配置
  getAppConfig: function () {
    const app = getApp();
    
    // 从本地存储获取配置
    try {
      const theme = wx.getStorageSync('theme') || 'light';
      const language = wx.getStorageSync('language') || 'zh_CN';
      
      this.setData({
        theme: theme,
        language: language
      });
    } catch (e) {
      console.error('获取应用配置失败:', e);
    }
  },

  // 返回聊天界面
  navigateBack: function () {
    wx.navigateBack({
      delta: 1,
      success: () => {
        console.log('返回成功');
      },
      fail: (err) => {
        console.error('返回失败:', err);
        // 如果返回失败，尝试跳转到首页
        wx.switchTab({
          url: '/pages/chat/chat'
        });
      }
    });
  },

  // 导航到个人资料
  navigateToProfile: function () {
    if (!this.data.userInfo) {
      // 如果未登录，跳转到登录页面
      this.showLoginModal();
      return;
    }
    
    // 这里可以跳转到个人资料页面
    console.log('跳转到个人资料页面');
    wx.showToast({
      title: '个人资料页面开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 导航到账号安全
  navigateToAccount: function () {
    console.log('跳转到账号安全页面');
    wx.showToast({
      title: '账号安全页面开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 导航到隐私设置
  navigateToPrivacy: function () {
    console.log('跳转到隐私设置页面');
    wx.showToast({
      title: '隐私设置页面开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 导航到消息通知
  navigateToNotification: function () {
    console.log('跳转到消息通知页面');
    wx.showToast({
      title: '消息通知页面开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 导航到外观设置
  navigateToAppearance: function () {
    console.log('跳转到外观设置页面');
    wx.showToast({
      title: '外观设置页面开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 导航到语言设置
  navigateToLanguage: function () {
    console.log('跳转到语言设置页面');
    wx.showToast({
      title: '语言设置页面开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 导航到关于我们
  navigateToAbout: function () {
    this.showAboutModal();
  },

  // 导航到意见反馈
  navigateToFeedback: function () {
    console.log('跳转到意见反馈页面');
    wx.showToast({
      title: '意见反馈页面开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 导航到联系我们
  navigateToContact: function () {
    this.showContactModal();
  },

  // 导航到用户协议
  navigateToAgreement: function () {
    this.showAgreementModal();
  },

  // 导航到隐私政策
  navigateToPrivacyPolicy: function () {
    this.showPrivacyPolicyModal();
  },

  // 显示登录模态框
  showLoginModal: function () {
    wx.showModal({
      title: '请先登录',
      content: '此功能需要登录后才能使用',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 跳转到聊天页面，聊天页面会自动弹出登录框
          wx.switchTab({
            url: '/pages/chat/chat'
          });
        }
      }
    });
  },

  // 显示关于我们模态框
  showAboutModal: function () {
    wx.showModal({
      title: '关于我们',
      content: '智绘青囊 v0.1.0\n\n我们致力于为用户提供专业的医疗健康咨询服务。\n\n本应用仅供参考，不能替代专业医疗建议。',
      showCancel: false,
      confirmText: '我知道了',
      confirmColor: '#667eea'
    });
  },

  // 显示联系我们模态框
  showContactModal: function () {
    wx.showModal({
      title: '联系我们',
      content: '客服邮箱：\n工作时间：9:00-18:00',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#667eea',
      success: (res) => {
        if (res.confirm) {
          // 可以添加复制联系方式的功能
          wx.setClipboardData({
            data: 'service@aimedical.com',
            success: () => {
              wx.showToast({
                title: '邮箱已复制',
                icon: 'success',
                duration: 1500
              });
            }
          });
        }
      }
    });
  },

  // 显示用户协议模态框
  showAgreementModal: function () {
    wx.showModal({
      title: '用户协议',
      content: '请仔细阅读并同意用户协议。\n\n1. 本服务仅供健康咨询参考\n2. 请勿用于医疗诊断\n3. 保护个人隐私安全\n4. 遵守法律法规',
      showCancel: false,
      confirmText: '同意',
      confirmColor: '#667eea'
    });
  },

  // 显示隐私政策模态框
  showPrivacyPolicyModal: function () {
    wx.showModal({
      title: '隐私政策',
      content: '我们非常重视您的隐私保护。\n\n1. 仅收集必要信息\n2. 保护数据安全\n3. 未经同意不共享信息\n4. 遵守相关法律法规',
      showCancel: false,
      confirmText: '同意',
      confirmColor: '#667eea'
    });
  },

  // 注销账号
  onDeleteAccount: function () {
    if (!this.data.userInfo) {
      this.showLoginModal();
      return;
    }
    
    // 显示确认对话框
    this.showDeleteAccountConfirm();
  },

  // 显示注销账号确认对话框
  showDeleteAccountConfirm: function () {
    // 创建动画
    const animation = wx.createAnimation({
      duration: 200,
      timingFunction: 'ease'
    });
    
    this.setData({
      showDeleteConfirm: true,
      modalAnimation: animation.scale(1).opacity(1).step().export()
    });
  },

  // 隐藏注销账号确认对话框
  hideDeleteConfirm: function () {
    const animation = wx.createAnimation({
      duration: 200,
      timingFunction: 'ease'
    });
    
    animation.scale(0.9).opacity(0).step();
    
    this.setData({
      modalAnimation: animation.export()
    });
    
    // 延迟隐藏
    setTimeout(() => {
      this.setData({
        showDeleteConfirm: false
      });
    }, 200);
  },

  // 确认注销账号
  confirmDeleteAccount: function () {
    const that = this;
    
    wx.showLoading({
      title: '处理中...',
      mask: true
    });
    
    // 这里应该调用云函数来删除用户账号
    // 暂时模拟删除操作
    setTimeout(() => {
      wx.hideLoading();
      
      // 模拟删除成功
      that.hideDeleteConfirm();
      
      // 清除用户数据
      const app = getApp();
      app.logout();
      
      // 更新页面状态
      that.setData({
        userInfo: null
      });
      
      wx.showToast({
        title: '账号已注销',
        icon: 'success',
        duration: 2000
      });
      
      // 延迟返回聊天页面
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/chat/chat?loadWithoutCheck=true'
        });
      }, 1500);
      
    }, 1500);
  },

  // 退出登录
  onLogout: function () {
    const that = this;
    
    if (!this.data.userInfo) {
      wx.showToast({
        title: '您还未登录',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 显示确认对话框
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      cancelText: '取消',
      confirmColor: '#ff4d4f',
      success: function (res) {
        if (res.confirm) {
          // 显示加载状态
          wx.showLoading({
            title: '退出中...',
            mask: true
          });
          
          // 延迟执行退出操作
          setTimeout(() => {
            // 清除登录状态和缓存数据
            const app = getApp();
            app.logout();
            
            // 更新页面状态
            that.setData({
              userInfo: null
            });
            
            wx.hideLoading();
            
            wx.showToast({
              title: '退出成功',
              icon: 'success',
              duration: 1500
            });
            
            // 延迟返回聊天页面
            setTimeout(() => {
              wx.switchTab({
                url: '/pages/chat/chat'
              });
            }, 1500);
            
          }, 1000);
        }
      }
    });
  }
});