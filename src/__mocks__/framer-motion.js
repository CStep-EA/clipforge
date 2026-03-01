// src/__mocks__/framer-motion.js
// Mock framer-motion to avoid ESM issues in Jest
// Tests don't need actual animations, just the DOM structure
const React = require('react');

const motion = new Proxy({}, {
  get: (_, tag) => {
    return React.forwardRef(({ children, ...props }, ref) => {
      // Strip out framer-motion-specific props that don't belong on DOM elements
      const {
        animate, initial, exit, transition, variants,
        whileHover, whileTap, whileFocus, whileInView, whileDrag,
        drag, dragConstraints, dragElastic, dragMomentum,
        layout, layoutId, onAnimationStart, onAnimationComplete,
        ...domProps
      } = props;
      return React.createElement(tag, { ...domProps, ref }, children);
    });
  }
});

const AnimatePresence = ({ children }) => children;

module.exports = { motion, AnimatePresence };
module.exports.default = module.exports;
