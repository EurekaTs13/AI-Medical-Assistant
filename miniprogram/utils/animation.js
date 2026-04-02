// utils/animation.js
/**
 * 动画工具类
 * 提供常用的动画创建方法
 */

/**
 * 创建基础动画
 * @param {Object} options - 动画选项
 * @returns {Object} 动画对象
 */
const createAnimation = (options = {}) => {
  const defaultOptions = {
    duration: 300,
    timingFunction: 'ease',
    delay: 0
  };
  
  return wx.createAnimation({
    ...defaultOptions,
    ...options
  });
};

/**
 * 创建渐入动画
 * @param {number} duration - 持续时间
 * @param {number} delay - 延迟时间
 * @returns {Object} 动画对象
 */
const createFadeInAnimation = (duration = 300, delay = 0) => {
  const animation = createAnimation({ duration, delay });
  animation.opacity(1).translateY(0).step();
  return animation.export();
};

/**
 * 创建滑入动画
 * @param {string} direction - 方向 (left/right/up/down)
 * @param {number} distance - 距离
 * @param {number} duration - 持续时间
 * @returns {Object} 动画对象
 */
const createSlideInAnimation = (direction = 'left', distance = 50, duration = 300) => {
  const animation = createAnimation({ duration });
  
  switch (direction) {
    case 'left':
      animation.translateX(distance).step({ duration: 0 });
      animation.translateX(0).step();
      break;
    case 'right':
      animation.translateX(-distance).step({ duration: 0 });
      animation.translateX(0).step();
      break;
    case 'up':
      animation.translateY(distance).step({ duration: 0 });
      animation.translateY(0).step();
      break;
    case 'down':
      animation.translateY(-distance).step({ duration: 0 });
      animation.translateY(0).step();
      break;
  }
  
  return animation.export();
};

/**
 * 创建缩放动画
 * @param {number} from - 起始缩放比例
 * @param {number} to - 结束缩放比例
 * @param {number} duration - 持续时间
 * @returns {Object} 动画对象
 */
const createScaleAnimation = (from = 0.8, to = 1, duration = 300) => {
  const animation = createAnimation({ duration });
  animation.scale(from).step({ duration: 0 });
  animation.scale(to).step();
  return animation.export();
};

/**
 * 创建旋转动画
 * @param {number} angle - 旋转角度
 * @param {number} duration - 持续时间
 * @returns {Object} 动画对象
 */
const createRotateAnimation = (angle = 360, duration = 300) => {
  const animation = createAnimation({ duration });
  animation.rotate(angle).step();
  return animation.export();
};

module.exports = {
  createAnimation,
  createFadeInAnimation,
  createSlideInAnimation,
  createScaleAnimation,
  createRotateAnimation
};