/**
 * 根据OpenID创建新用户记录或更新已存在用户的最后登录时间
 * 此函数首先调用 `checkUser` 云函数判断用户是否存在，再执行相应操作
 * @param {string} event.userData - 注册时产生的用户信息
 * @param {Object} context - 云函数调用上下文
 * @returns {Object} 返回一个操作结果对象
 * @returns {number} return.code - 状态码 (200: 更新成功, 201: 创建成功, 500: 服务器内部错误)
 * @returns {string} return.message - 操作的详细文本描述
 * @returns {string} return.openid - 本次操作对应的用户OpenID
 * @returns {Object|null} [return.error] - 如果操作过程中发生错误，则返回错误对象
 */

// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
	const nickname = event.userData.nickname
	const avatar_url = event.userData.avatar_url
  
  try {
    // 确定要使用的openid：优先使用参数传入的，否则使用上下文中的
    const targetOpenid = event.openid || wxContext.OPENID;
    
    if (!targetOpenid) {
      return {
        code: 400,
        message: '参数错误：无法确定用户OpenID'
      };
		}
	
    // 构建新用户对象
    const newUser = {
      openid: targetOpenid,
      createTime: db.serverDate(),      // 创建时间
      lastLoginTime: db.serverDate(),   // 最后登录时间（初始与创建时间相同）
      status: 1,                        // 用户状态：1-正常
			avatar_url: avatar_url,        //头像地址
			nickname: nickname			,			//昵称
		};
    
    // 将新用户记录添加到数据库
    const addResult = await db.collection('User').add({
      data: newUser
		});
	
    return {
      code: 201,
      message: '新用户创建成功',
      openid: targetOpenid,
      userId: addResult._id,   // 返回新记录的唯一ID
    };
    
  } catch (error) {
    console.error('创建新用户失败:', error);
    return {
      code: 500,
      message: '服务器内部错误，用户创建失败',
      error: error.message
    };
  };
}