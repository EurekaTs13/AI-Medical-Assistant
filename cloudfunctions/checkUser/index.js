/**
 * 检查指定的用户OpenID是否已在用户集合中存在
 * @param {Object} event - 调用云函数时传入的参数对象
 * @param {Object} context - 云函数调用上下文，包含运行环境等信息
 * @returns {boolean} return.exists - 表示用户是否存在（true: 存在, false: 不存在）
 * @returns {string} return.openid -用户openid
 * @returns {Object|null} return.userRecord - 如果用户存在，则返回完整的用户记录对象；如果不存在，则此字段可能为undefined或null
 * @returns {Object|null} [return.error] - 如果查询过程中发生错误，则返回错误对象
 */

// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db=cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
	const wxContext = cloud.getWXContext();
	openid= event.openid || wxContext.OPENID;

  try {
    // 查询数据库
    const queryResult = await db.collection('User').where({
      openid: openid
    }).get()

    // 判断并返回结果
    if (queryResult.data.length > 0) {
      // 用户存在
      return {
        exists: true,
				userRecord: queryResult.data[0] ,// 返回完整的用户记录，供后续使用
				openid:openid
      }
    } else {
      // 用户不存在
      return {
				exists: false,
				openid:openid
      }
    }
  } catch (err) {
    // 错误处理
    console.error(err)
    return {
      exists: false,
      error: err
    }
  }
}