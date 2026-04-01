class Auth {
  // 检查是否已登录
  static isLogin() {
    const token = wx.getStorageSync('token');
    return !!token;
  }

  // 获取用户信息
  static getUserInfo() {
    return wx.getStorageSync('userInfo');
  }

  // 获取 token
  static getToken() {
    return wx.getStorageSync('token');
  }
}

export default Auth;