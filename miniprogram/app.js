// app.js
App({
  globalData: {
    userInfo: null,
    token: null,
    env: "cloud1-8gqij1hff49654b7",
  },

  onLaunch: function () {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
    this.checkLoginStatus();
  },

  // 登录成功后保存状态
  saveLoginStatus(token, userInfo) {
    wx.setStorageSync('token', token);
    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('loginTime', Date.now());
    this.globalData.token = token;
    this.globalData.userInfo = userInfo;
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    const loginTime = wx.getStorageSync('loginTime');
    
    if (token && userInfo) {
      const isExpired = this.checkTokenExpired(loginTime, 7 * 24 * 60 * 60 * 1000);
      
      if (!isExpired) {
        this.globalData.token = token;
        this.globalData.userInfo = userInfo;
        console.log('登录状态恢复成功');
      } else {
        this.clearLoginStatus();
      }
    }
  },

  // 检查 token 是否过期
  checkTokenExpired(loginTime, maxAge) {
    return Date.now() - loginTime > maxAge;
  },

  // 清除登录状态
  clearLoginStatus() {
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('loginTime');
    this.globalData.token = null;
    this.globalData.userInfo = null;
  },

  // 退出登录
  logout(redirectUrl = '/pages/chat/chat') {
    this.clearLoginStatus();
    wx.reLaunch({
      url: redirectUrl
    });
  }
});
