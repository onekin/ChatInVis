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
    if (node.parentElement.innerHTML.includes('border-radius: 0px;') && node._domElement.parentElement.innerHTML.includes('padding: 11.4px')) {
      return true
    } else {
      return false
    }
  }
  static nodeElementHasCloudShape (node) {
    // translateX +6
    // translateY +6
  }
}

module.exports = CheckMapUtils
