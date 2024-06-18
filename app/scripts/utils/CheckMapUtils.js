class CheckMapUtils {
  static nodeElementHasQuestionMark (node) {
    if (node._domElement.innerHTML.includes('button aria-label="❓, question')) {
      return true
    } else {
      return false
    }
  }
  static mindmapNodeHasRectangleShape (node) {
    if (node._domElement.parentElement.innerHTML.includes('border-radius: 0px;') && node._domElement.parentElement.innerHTML.includes('padding: 11.4px')) {
      return true
    } else {
      return false
    }
  }
  static nodeElementHasRectangleShape (node) {
    const style = node.children[0].firstChild.firstChild.style
    // Check for specific style properties
    // const hasBorderRadius = style.borderRadius === '0px'
    const hasPadding = style.padding === '11.4px'
    if (hasPadding) {
      // Your code here
      return true
    } else {
      return false
    }
  }
}

module.exports = CheckMapUtils
