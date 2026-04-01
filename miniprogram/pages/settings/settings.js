Page({
  data: {
    navBarStyle: {}
  },

  onLoad: function () {
    // 获取胶囊按钮位置并调整导航栏
    this.adjustNavBar();
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
    
    this.setData({
      navBarStyle: navBarStyle
    });
  },

  // 返回聊天界面
  navigateBack: function () {
    wx.navigateBack({
      delta: 1
    });
  },
  
  // 退出登录
  onLogout: function () {
    const that = this;
    
    // 显示确认对话框
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: function (res) {
        if (res.confirm) {
          // 显示加载状态
          wx.showLoading({
            title: '退出中...',
            mask: true
          });
          
          // 清除登录状态和缓存数据
          const app = getApp();
          app.logout();
          
          // 隐藏加载状态
          wx.hideLoading();
        }
      }
    });
  }
});