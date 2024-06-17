
const Locators = require('./Locators')
const CheckMapUtils = require('../../utils/CheckMapUtils')
const IconsMap = require('../../chatinviz/IconsMap')

class MindmapWrapper {
  static getNodeById (id) {
    let locator = Locators.MINDMAP_NODE_BY_ID.replace('$1', `"${id}"`)
    let el = document.querySelector(locator)
    if (el == null) return null
    return new MindmapNode(el)
  }

  static getNodesByText (text) {
    let locator = Locators.MINDMAP_NODES
    let els = document.querySelectorAll(locator)
    let nodes = []
    els.forEach((el) => {
      let node = new MindmapNode(el)
      if (text === node.text) nodes.push(node)
    })
    return nodes
  }

  static getNodesByIcon (icon) {
    let locator = Locators.MINDMAP_NODES
    let els = document.querySelectorAll(locator)
    let nodes = []
    els.forEach((el) => {
      let node = new MindmapNode(el)
      nodes.push(node)
    })
    nodes = nodes.filter((n) => { return n.emojiIcon != null && (n.emojiIcon === IconsMap[icon].mindmeisterName.replace(/:/g, '')) })
    return nodes
  }

  static hasIcon (node, icon) {
    let mindmapNode = new MindmapNode(node)
    return mindmapNode.emojiIcon != null && (mindmapNode.emojiIcon === IconsMap[icon].mindmeisterName.replace(/:/g, ''))
  }

  static getTypeOfNode (node) {
    let mindmapNode = new MindmapNode(node)
    if (mindmapNode.emojiIcon != null && (mindmapNode.emojiIcon === IconsMap['question'].mindmeisterName.replace(/:/g, ''))) {
      return 'question'
    } else if (mindmapNode.emojiIcon != null && (mindmapNode.emojiIcon === IconsMap['magnifier'].mindmeisterName.replace(/:/g, ''))) {
      return 'answer'
    } else {
      return 'unknown'
    }
  }

  static getNodesByTextRegexp (regexp) {
    let locator = Locators.MINDMAP_NODES
    let els = document.querySelectorAll(locator)
    let nodes = []
    els.forEach((el) => {
      let node = new MindmapNode(el)
      if (regexp.test(node.text)) nodes.push(node)
    })
    return nodes
  }

  static getNodesByRGBBackgroundColor (color) {
    // todo
    let colorString = `rgb(${color.r}, ${color.g}, ${color.b})`
    let locator = Locators.MINDMAP_NODES
    let els = document.querySelectorAll(locator)
    let nodes = []
    els.forEach((el) => {
      let node = new MindmapNode(el)
      if (node.backgroundColor == null) return
      if (node.backgroundColor.toLowerCase().replace(/\s/g, '').trim() === colorString.toLowerCase().replace(/\s/g, '').trim()) nodes.push(node)
    })
    return nodes
  }

  // This function will search for SVG elements with the specified style and no class
  static findSVGWithSpecificStyleAndNoClass () {
    // Get all SVG elements in the document
    const svgs = document.querySelectorAll('svg')
    // Define the specific style you are looking for
    const specificStyle = 'width: 1e+06px; height: 1e+06px; transform: translate(-500000px, -500000px); position: absolute; top: 0px; left: 0px; pointer-events: none;'

    // Loop through all SVG elements to find a match
    for (const svg of svgs) {
      // Normalize style string for consistent comparison
      const svgStyle = svg.getAttribute('style').replace(/\s+/g, '')
      const hasNoClass = svg.className.baseVal === '' // Check if className is empty

      if (svgStyle === specificStyle.replace(/\s+/g, '') && hasNoClass) {
        console.log('SVG with specific style and no class found:', svg)
        return svg // Return the SVG element if found
      }
    }
    console.log('No SVG with the specific style and no class was found.')
    return null // Return null if no SVG matches the specific criteria
  }

  static getNodesByShape (shape) {
    let locator = Locators.MINDMAP_NODES
    let els = document.querySelectorAll(locator)
    let nodes = []
    els.forEach((el) => {
      let node = new MindmapNode(el)
      if (shape === 'rectangle' && CheckMapUtils.nodeElementHasRectangleShape(node)) {
        nodes.push(node)
      }
    })
    return nodes
  }
}

class MindmapNode {
  constructor (el) {
    this._domElement = el
  }

  get text () {
    return this._domElement.innerText.replace(/\n/g, ' ').trim()
  }
  get id () {
    return this._domElement.getAttribute('data-id')
  }
  get emojiIcon () {
    let locator = Locators.MINDMAP_NODE_ICON_EMOJI
    let icon = this._domElement.querySelector(locator)
    if (icon == null) return null
    let emoji = icon.getAttribute('aria-label')
    if (emoji == null) return null
    let parts = emoji.split(',')
    if (parts.length < 2) return null
    return parts[1].trim()
  }

  get element () {
    return this._domElement
  }
  getIconElement () {
    let locator = Locators.MINDMAP_NODE_ICON
    let icon = this._domElement.querySelector(locator)
    return icon
  }

  get backgroundColor () {
    return this._domElement.style.backgroundColor || null
  }

  get children () {
  }
}

module.exports = MindmapWrapper
