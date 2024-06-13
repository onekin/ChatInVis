// import * as pdfjsLib from 'pdfjs-dist/webpack';
const Config = require('../Config')
const LLMTextUtils = require('../utils/LLMTextUtils')
const LLMClient = require('../llm/LLMClient')
const MindmapWrapper = require('../mindmeister/wrapper/MindmapWrapper')
const TemplateNodes = require('./TemplateNodes')
const MindmeisterClient = require('../mindmeister/MindmeisterClient')
const Alerts = require('../utils/Alerts')
const MindmapContentParser = require('../mindmeister/wrapper/MindmapContentParser')
const ProcessQuestions = require('./ProcessQuestions')
const Consequence = require('./model/Consequence')
const PromptBuilder = require('./PromptBuilder')
const Problem = require('./model/Problem')
const PromptStyles = require('./PromptStyles')
const IconsMap = require('./IconsMap')
const Utils = require('../utils/Utils')
const CheckMapUtils = require('../utils/CheckMapUtils')
const Locators = require('../mindmeister/wrapper/Locators')
const ITEMS = '4'
const _ = require('lodash')

class MindmapManager {
  constructor () {
    this._mapId = null
    this._mindmapParser = null
  }

  kudeatzaileakHasieratu (that) {
    const checkDOM = setInterval(function () {
      // Options for the observer (which mutations to observe)
      const config = { attributes: true, childList: true, subtree: true }
      // Callback function to execute when mutations are observed
      const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
          if (mutation.type === 'childList') {
            mutation.removedNodes.forEach(node => {
              if (node.classList && node.classList.contains('kr-view')) {
                let style = node.style
                if (style.position === 'absolute' && (style.transformOrigin === 'left center' || style.transformOrigin === 'center top')) {
                  let title = document.querySelectorAll('.plusTitle')
                  let title2 = document.querySelectorAll('.plusTitleOwn')
                  if (title && title2) {
                    Array.from(title).concat(Array.from(title2)).forEach((t) => {
                      t.remove()
                    })
                  }
                }
              }
            })
            if (mutation.addedNodes) {
              if (mutation.addedNodes.length > 0) {
                const node = mutation.addedNodes[0]
                if (node.innerText && (node.innerText.includes('Attachments') || node.innerText.includes('Archivos adjuntos'))) {
                  let currentNode = that.getCurrentNode()
                  if (!that.isAnswerNode(currentNode)) {
                    that.manageAttachmentsMenu(that, node)
                  }
                } else if (node.innerHTML && node.innerHTML.includes(Locators.PDF_ELEMENT) && node.innerHTML.includes('.pdf')) {
                  let divs = document.querySelectorAll('div.kr-view')
                  let targetDiv = Array.from(divs).find(div => div.getAttribute('style').includes('padding-top: 10px; padding-bottom: 10px; width: 320px; background-color: rgb(255, 255, 255);'))
                  let currentNode = that.getCurrentNode()
                  if (!that.isAnswerNode(currentNode)) {
                    that.manageAttachmentsMenu(that, targetDiv)
                  }
                } else if (node.innerText && (node.innerText.includes('Drag & drop files') || node.innerText.includes('Arrastra y suelta archivos o pega enlaces en los temas.'))) {
                  that.manageContextMenu(that)
                } else if (node.classList && node.classList.contains('kr-view')) {
                  let style = node.style
                  if (style.position === 'absolute' && style.transformOrigin === 'left center') {
                    node.classList.add('addButton')
                    let currentNode = that.getCurrentNode()
                    let nodeTitle = currentNode.innerText
                    that.parseMap().then(() => {
                      let nodeObject = that._mindmapParser.getNodeById(currentNode.dataset.id)
                      if (nodeObject && nodeObject._info) {
                        if (that.isAnswerNode(currentNode) || nodeTitle === 'PROBLEM ANALYSIS') {
                          let parent = that._mindmapParser.getNodeById(nodeObject._info.parent)
                          if (parent._info.title.startsWith('WHICH') || that.isAddressProblemNode(currentNode)) {
                            const h1Element = document.createElement('h2')
                            h1Element.style.position = 'absolute'
                            h1Element.style.top = `${parseInt(style.top, 10) - 24}px` // Subtract 30px from top
                            h1Element.style.left = `${parseInt(style.left, 10) + 42}px`
                            h1Element.textContent = 'more consequences'
                            h1Element.style.color = 'rgb(0, 170, 255)'
                            h1Element.className = 'plusTitle'
                            node.insertAdjacentElement('afterend', h1Element)
                            h1Element.addEventListener('click', (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              that.onClickAnswer(currentNode)
                            })
                            // node.className = 'addCausesButton'
                            node.addEventListener('click', (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              that.onClickAnswer(currentNode)
                            })
                          } else {
                            const h1Element = document.createElement('h2')
                            h1Element.style.position = 'absolute'
                            h1Element.style.top = `${parseInt(style.top, 10) - 24}px` // Subtract 30px from top
                            h1Element.style.left = `${parseInt(style.left, 10) + 42}px`
                            h1Element.textContent = 'more causes'
                            h1Element.style.color = 'rgb(0, 170, 255)'
                            h1Element.className = 'plusTitle'
                            node.insertAdjacentElement('afterend', h1Element)
                            h1Element.addEventListener('click', (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              that.createCauseMappingNode(currentNode)
                            })
                            node.addEventListener('click', (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              that.createCauseMappingNode(currentNode)
                            })
                          }
                        } else if (that.isQuestionNode(currentNode)) {
                          const h1Element = document.createElement('h2')
                          h1Element.style.position = 'absolute'
                          h1Element.style.top = `${parseInt(style.top, 10) - 24}px` // Subtract 30px from top
                          h1Element.style.left = `${parseInt(style.left, 10) + 42}px`
                          h1Element.textContent = 'ask question'
                          h1Element.style.color = 'rgb(0, 170, 255)'
                          h1Element.className = 'plusTitle'
                          node.insertAdjacentElement('afterend', h1Element)
                          h1Element.addEventListener('click', (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            that.performQuestion(currentNode)
                          })
                          // node.className = 'addCausesButton'
                          node.addEventListener('click', (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            that.performQuestion(currentNode)
                          })
                        } else if (that.isGoodnessCriteriaNode(that, currentNode, nodeObject)) {
                          const h1Element = document.createElement('h2')
                          h1Element.style.position = 'absolute'
                          h1Element.style.top = `${parseInt(style.top, 10) - 24}px` // Subtract 30px from top
                          h1Element.style.left = `${parseInt(style.left, 10) + 42}px`
                          h1Element.textContent = 'more...'
                          h1Element.style.color = 'rgb(0, 170, 255)'
                          h1Element.className = 'plusTitle'
                          node.insertAdjacentElement('afterend', h1Element)
                          h1Element.addEventListener('click', (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            that.createGoodnessCriteriaQuestionNode(currentNode)
                          })
                          // node.className = 'addCausesButton'
                          node.addEventListener('click', (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            that.createGoodnessCriteriaQuestionNode(currentNode)
                          })
                        }
                        that.addObserverToAddButton()
                      }
                    })
                  } else if (style.position === 'absolute' && style.transformOrigin === 'center top') {
                    let currentNode = that.getCurrentNode()
                    node.classList.add('addOwnButton')
                    that.parseMap().then(() => {
                      let nodeObject = that._mindmapParser.getNodeById(currentNode.dataset.id)
                      if (nodeObject && nodeObject._info) {
                        if (that.isAnswerNode(currentNode)) {
                          let parent = that._mindmapParser.getNodeById(nodeObject._info.parent)
                          if (parent._info.title.startsWith('WHICH') || that.isAddressProblemNode(currentNode)) {
                            const h1Element = document.createElement('h2')
                            h1Element.style.position = 'absolute'
                            h1Element.style.top = `${parseInt(style.top, 10) - 24}px` // Subtract 30px from top
                            h1Element.style.left = `${parseInt(style.left, 10) + 42}px`
                            // h1Element.textContent = 'add question'
                            h1Element.style.color = 'rgb(0, 170, 255)'
                            h1Element.className = 'plusTitleOwn'
                            h1Element.innerText = 'add own consequence'
                            node.insertAdjacentElement('afterend', h1Element)
                            h1Element.addEventListener('click', (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              that.addSiblingNode(that, nodeObject, 'consequenceNode')
                            })
                            node.addEventListener('click', (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              that.addSiblingNode(that, nodeObject, 'consequenceNode')
                            })
                          } else {
                            const h1Element = document.createElement('h2')
                            h1Element.style.position = 'absolute'
                            h1Element.style.top = `${parseInt(style.top, 10) - 24}px` // Subtract 30px from top
                            h1Element.style.left = `${parseInt(style.left, 10) + 42}px`
                            h1Element.textContent = 'add own cause'
                            h1Element.style.color = 'rgb(0, 170, 255)'
                            h1Element.className = 'plusTitleOwn'
                            node.insertAdjacentElement('afterend', h1Element)
                            h1Element.addEventListener('click', (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              that.addSiblingNode(that, nodeObject, 'causeNode')
                            })
                            node.addEventListener('click', (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              that.addSiblingNode(that, nodeObject, 'causeNode')
                            })
                          }
                        } else if (that.isQuestionNode(currentNode)) {
                          let nodeObject = that._mindmapParser.getNodeById(currentNode.dataset.id)
                          const h1Element = document.createElement('h2')
                          h1Element.style.position = 'absolute'
                          h1Element.style.top = `${parseInt(style.top, 10) - 24}px` // Subtract 30px from top
                          h1Element.style.left = `${parseInt(style.left, 10) + 42}px`
                          h1Element.textContent = 'add own question'
                          h1Element.style.color = 'rgb(0, 170, 255)'
                          h1Element.className = 'plusTitleOwn'
                          node.insertAdjacentElement('afterend', h1Element)
                          h1Element.addEventListener('click', (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            that.addSiblingNode(that, nodeObject, 'questionNode')
                          })
                          node.addEventListener('click', (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            that.addSiblingNode(that, nodeObject, 'questionNode')
                          })
                        } else if (that.isGoodnessCriteriaNode(that, currentNode, nodeObject)) {
                          //
                        }
                      }
                    })
                  }
                }
              }
            }
          }
        }
      }
      // Create an observer instance linked to the callback function
      const observer = new MutationObserver(callback)
      // Start observing the target node for configured mutations
      observer.observe(document.body, config)
      clearInterval(checkDOM)
    }, 1000)
  }

  init () {
    let that = this
    let node = this.getRootNode()
    if (node == null) {
      setTimeout(() => {
        that.init()
      }, 100)
      return
    }
    this.isChatinVizMap(node).then(() => {
      Alerts.showLoadingWindow('Loading...')
      that._mapId = node._domElement.dataset.id
      setTimeout(() => {
        Alerts.closeLoadingWindow()
        that.initChangeManager()
      }, 5000)
      // this.kudeatzaileakHasieratu(that)
    })
  }
  getRootNode () {
    let urlRegexp = /https?:\/\/www\.mindmeister\.com\/(map|app\/map)\/(\d+)($|\/|\?|#)/
    let m = window.location.href.match(urlRegexp)
    if (m == null || m.length < 3) return
    let nodeId = m[2]
    return MindmapWrapper.getNodeById(nodeId)
  }
  isChatinVizMap (rootNode) {
    // Save if it is a ChatinViz map
    return new Promise((resolve, reject) => {
      if (CheckMapUtils.nodeElementHasQuestionMark(rootNode) && CheckMapUtils.nodeElementHasRectangleShape(rootNode)) {
        resolve()
      } else {
        Alerts.showErrorToast('This is not a ChatinViz map')
        reject(new Error('Template nodes not found in the map'))
      }
    })
  }
  initChangeManager () {
    let that = this
    let rootNode = MindmapWrapper.getNodeById(this._mapId)
    if (rootNode == null) {
      setTimeout(() => {
        that.initChangeManager()
      }, 100)
      return
    }
    let parent = rootNode.element.parentNode
    let obs = new MutationObserver((mutations) => {
      let newNodes = mutations.find((m) => {
        let addedNodes = Array.from(m.addedNodes)
        let mapNodes = addedNodes.find((n) => { return n.hasAttributes('data-id') })
        return mapNodes != null
      })
      if (newNodes) {
        that.addQuestionClickManager()
        that.addAnswerClickManager()
      }
    })
    let config = { childList: true, subtree: true }
    obs.observe(parent, config)
    // obs.observe(document, config)
    this.addQuestionClickManager()
    this.addAnswerClickManager()
  }

  createCauseMappingNode (currentNode) {
    let that = this
    that.parseMap().then((mapInfo) => {
      let scopingAnalysisNodes = this._mindmapParser.getNodesWithText(TemplateNodes.PROBLEM_ANALYSIS)
      if (scopingAnalysisNodes == null || scopingAnalysisNodes.length === 0) return
      let question = ProcessQuestions.PROBLEM_ANALYSIS
      let items = MindmapManager.extractQuestionItems(question)
      let variables = that._variables
      let perceivedProblem
      if (currentNode._domElement && currentNode._domElement.innerText === 'PROBLEM ANALYSIS') {
        perceivedProblem = that._perceivedProblem
      } else {
        perceivedProblem = currentNode.innerText
      }
      items.forEach((i) => {
        let v = variables.find((variable) => {
          let variableName = variable.name.toLowerCase()
          return variableName === i.toLowerCase()
        })
        if (v !== null && v !== undefined) {
          question = question.replace(`<${i}>`, v.value)
          _.remove(variables, v)
        }
      })
      question = question.replace(`<Problem>`, perceivedProblem)
      if (variables.length > 0) {
        question = question.replace('?', ' ')
        variables.forEach((v) => {
          question = question + ' and assuming that ' + v.name + ' is ' + v.value
        })
        question = question + '?'
      }
      let missingItems = MindmapManager.extractQuestionItems(question)
      if (missingItems.length > 0) {
        Alerts.showErrorToast(`Missing variables: ${missingItems}`)
      } else {
        let parentId
        if (currentNode.dataset) {
          parentId = currentNode.dataset.id
        } else if (currentNode._domElement) {
          parentId = currentNode._domElement.dataset.id
        } else {
          parentId = currentNode.id
        }
        // let modeChanges = that.modeEnableChanges(that._processModes.find((m) => { return m.name === 'CAUSE_MAPPING' }))
        MindmeisterClient.doActions(that._mapId, [{text: question, parentId: parentId, style: PromptStyles.QuestionPrompt, image: IconsMap.magnifier}]).then(() => {
          // MindmeisterClient.doActions(that._mapId, [{text: question, parentId: parentId, style: PromptStyles.QuestionPrompt}]).then(() => {
          let title = document.querySelectorAll('.plusTitle')
          if (title) {
            title.forEach((t) => {
              t.remove()
            })
          }
          let title2 = document.querySelectorAll('.plusTitleOwn')
          if (title2) {
            title2.forEach((t) => {
              t.remove()
            })
          }
          Alerts.closeLoadingWindow()
        })
      }
    })
  }
  createGoodnessCriteriaQuestionNode (currentNode) {
    let that = this
    that.parseMap().then((mapInfo) => {
      let question = ProcessQuestions.EXPERIMENTAL_QUESTION
      let items = MindmapManager.extractQuestionItems(question)
      let variables = that._variables
      let perceivedProblem = that._perceivedProblem
      let criteria = currentNode.innerText
      items.forEach((i) => {
        let v = variables.find((variable) => {
          let variableName = variable.name.toLowerCase()
          return variableName === i.toLowerCase()
        })
        if (v !== null && v !== undefined) {
          question = question.replace(`<${i}>`, v.value)
          _.remove(variables, v)
        }
      })
      question = question.replace(`<Problem>`, perceivedProblem)
      question = question.replace(`<Criteria>`, criteria)
      let addressedProblem = that.getCurrentAddressedProblem()
      if (addressedProblem._domElement) {
        question = question.replace(`<AddressedProblem>`, addressedProblem._domElement.innerText.replaceAll('\n', ' '))
      } else {
        question = question.replace(`<AddressedProblem>`, 'a problem')
      }
      if (variables.length > 0) {
        question = question.replace('?', ' ')
        variables.forEach((v) => {
          question = question + ' and assuming that ' + v.name + ' is ' + v.value
        })
        question = question + '?'
      }
      let missingItems = MindmapManager.extractQuestionItems(question)
      if (missingItems.length > 0) {
        Alerts.showErrorToast(`Missing variables: ${missingItems}`)
      } else {
        let parentId
        if (currentNode.dataset) {
          parentId = currentNode.dataset.id
        } else if (currentNode._domElement) {
          parentId = currentNode._domElement.dataset.id
        } else {
          parentId = currentNode.id
        }
        // let modeChanges = that.modeEnableChanges(that._processModes.find((m) => { return m.name === 'CAUSE_MAPPING' }))
        MindmeisterClient.doActions(that._mapId, [{text: question, parentId: parentId, style: PromptStyles.QuestionPrompt, image: IconsMap.magnifier}]).then(() => {
          // MindmeisterClient.doActions(that._mapId, [{text: question, parentId: parentId, style: PromptStyles.QuestionPrompt}]).then(() => {
          let title = document.querySelectorAll('.plusTitle')
          if (title) {
            title.forEach((t) => {
              t.remove()
            })
          }
          let title2 = document.querySelectorAll('.plusTitleOwn')
          if (title2) {
            title2.forEach((t) => {
              t.remove()
            })
          }
          Alerts.closeLoadingWindow()
        })
      }
    })
  }
  /**
   *  Manage editor changes
   */
  manageAttachmentsMenu (that, node) {
    // Example usage
    const classNames = Utils.extractNumbersFromClassNames(node.innerHTML)
    if (classNames.length > 0) {
      const window = node.querySelector('.knightrider-scrollview-scrollelement')
      const myDivs = window.querySelectorAll('div.kr-view.react-popover-trigger')
      let attachments = []
      Array.from(myDivs).forEach((div) => {
        let name = div.parentNode.children[1].children[0].innerText
        let id = Utils.extractNumbersFromClassNames(div.parentNode.innerHTML)
        if (id.length > 0) {
          id = id[0]
          let button = document.createElement('button')
          button.id = id
          button.className = 'chatin-attachment-button'
          button.innerText = 'Ask GPT'
          button.addEventListener('click', function (event) {
            // You can handle the click event here.
            event.stopPropagation()
            let questionNodeID = that.getCurrentNodeId()
            let questionNode = MindmapWrapper.getNodeById(questionNodeID)
            if (id && name && questionNode) {
              that.performPDFBasedQuestion(questionNode, id, name)
            }
          })
          div.parentNode.appendChild(button)
          attachments.push({name: name, id: id, button: button})
        }
      })
    }
  }
  manageContextMenu (that) {
    document.querySelectorAll('div').forEach(function (div) {
      const expectedStyle = 'width: 90px; margin-bottom: 10px; padding-top: 7px; padding-bottom: 7px; flex-direction: column; align-items: center; justify-content: center; border-radius: 10px; background-color: rgba(0, 0, 0, 0.05); cursor: pointer; transform: scaleX(1) scaleY(1);'
      if ((div.textContent.includes('Task') || div.textContent.includes('Tarea')) && div.getAttribute('style') === expectedStyle) {
        let questionNode = that.getCurrentNode()
        if (that.isQuestionNode(questionNode)) {
          // Create a duplicate of the div
          let aggregateButton = div.cloneNode(true)
          // Optionally, you can change the content or attributes of the duplicate
          aggregateButton.textContent = 'Compact'
          aggregateButton.style = 'width: 100%; margin-bottom: 10px; padding-top: 7px; padding-bottom: 7px; flex-direction: column; align-items: center; justify-content: center; border-radius: 10px; background-color: rgba(0, 0, 0, 0.05); cursor: pointer; transform: scaleX(1) scaleY(1);'
          // Insert the duplicate after the original div
          div.parentNode.insertBefore(aggregateButton, aggregateButton.nextSibling)
          aggregateButton.addEventListener('click', function (event) {
            that.parseMap().then(() => {
              let questionNodeObject = that._mindmapParser.getNodeById(questionNode.getAttribute('data-id'))
              if (that.canBeAggregated(questionNodeObject)) {
                Alerts.infoAlert({
                  title: 'Compacting nodes',
                  text: 'This operation will remove relevant information within the aggregated nodes. Do you want to continue?',
                  showCancelButton: true,
                  confirmButtonText: 'Yes',
                  cancelButtonText: 'No',
                  callback: () => {
                    that.performAggregationQuestion(questionNodeObject)
                  }
                })
              } else {
                that.performAggregationQuestion(questionNodeObject)
              }
            })
          })
          let consensusButton = div.cloneNode(true)
          // Optionally, you can change the content or attributes of the duplicate
          consensusButton.textContent = 'Consensus'
          consensusButton.style = 'width: 100%; margin-bottom: 10px; padding-top: 7px; padding-bottom: 7px; flex-direction: column; align-items: center; justify-content: center; border-radius: 10px; background-color: rgba(0, 0, 0, 0.05); cursor: pointer; transform: scaleX(1) scaleY(1);'
          // Insert the duplicate after the original div
          div.parentNode.insertBefore(consensusButton, div.nextSibling)
          consensusButton.addEventListener('click', function (event) {
            console.log('click on Consensus')
            that.parseMap().then(() => {
              let questionNodeObject = that._mindmapParser.getNodeById(questionNode.getAttribute('data-id'))
              const nodeText = questionNodeObject._info.title.replaceAll('\n', ' ')
              const encodedUri = encodeURIComponent(nodeText)
              const uri = 'https://consensus.app/results/?q=' + encodedUri
              window.open(uri)
              console.log('click on Consensus')
            })
          })
        } else {
          if (that.isAnswerNode(questionNode)) {
            let consensusButton = div.cloneNode(true)
            // Optionally, you can change the content or attributes of the duplicate
            consensusButton.textContent = 'Consensus'
            consensusButton.style = 'width: 100%; margin-bottom: 10px; padding-top: 7px; padding-bottom: 7px; flex-direction: column; align-items: center; justify-content: center; border-radius: 10px; background-color: rgba(0, 0, 0, 0.05); cursor: pointer; transform: scaleX(1) scaleY(1);'
            // Insert the duplicate after the original div
            div.parentNode.insertBefore(consensusButton, div.nextSibling)
            consensusButton.addEventListener('click', function (event) {
              console.log('click on Consensus')
              that.parseMap().then(() => {
                let variables = that._variables
                let practice = variables.find((v) => { return v.name === 'Practice' }).value
                let activity = variables.find((v) => { return v.name === 'Activity' }).value
                let questionNodeObject = that._mindmapParser.getNodeById(questionNode.getAttribute('data-id'))
                const nodeText = questionNodeObject._info.title
                const question = 'How can ' + nodeText + ' be lessened in ' + practice + ' to ' + activity + '?'
                const encodedUri = encodeURIComponent(question)
                const uri = 'https://consensus.app/results/?q=' + encodedUri
                window.open(uri)
                console.log('click on Consensus')
              })
            })
          }
        }
      }
    })
  }
  /**
   * Management of question nodes
   */
  addQuestionClickManager () {
    let that = this
    let questionNodes = MindmapWrapper.getNodesByIcon('question')
    // let allCloudNodes = that.getCloudNodes(that)
    // let questionNodes = allQuestionNodes.filter((n) => { return !CheckMapUtils.nodeElementHasCloudShape(n) })
    // let systemNodes = allQuestionNodes.filter((n) => { return CheckMapUtils.nodeElementHasCloudShape(n) })
    questionNodes.forEach((n) => {
      let iconElement = n.getIconElement()
      if (iconElement == null || iconElement.classList.contains('chatin_question')) return
      iconElement.classList.add('chatin_question')
      iconElement.style.removeProperty('pointer-events')
      iconElement.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        that.performQuestionToLLM(n)
      })
    })
  }
  getCloudNodes (that) {
    // Get position of cloud nodes
    let dataIds = that.getCloudIds()
    let cloudNodes = dataIds.map(id => MindmapWrapper.getNodeById(id)).filter(node => node !== null)
    console.log(cloudNodes)
    return cloudNodes
  }
  getCloudIds () {
    // Get position of cloud nodes
    let svg = MindmapWrapper.findSVGWithSpecificStyleAndNoClass()
    if (svg == null) {
      return []
    } else {
      let cloudsContainer = Array.from(svg.children)
      let cloudsCoordinates = cloudsContainer.filter(el => el.tagName.toLowerCase() === 'path')
        .map(path => {
          const d = path.getAttribute('d')
          const match = /M\s*(-?\d+\.?\d*)\s*(-?\d+\.?\d*)/.exec(d)
          if (match) {
            return { x: parseFloat(match[1]), y: parseFloat(match[2]) }
          }
          return null
        })
        .filter(coords => coords !== null)
      console.log(cloudsCoordinates)
      // Find corresponding divs based on the cloud node positions and extract data-id attributes
      let dataIds = cloudsCoordinates.map(node => {
        const xTransform = node.x - 6
        const yTransform = node.y - 6
        const transformedDiv = document.querySelector(`div[style*="transform: translateX(${xTransform}px) translateY(${yTransform}px)"]`)
        return transformedDiv ? transformedDiv.getAttribute('data-id') : null
      }).filter(dataId => dataId !== null) // Filter out nulls if no matching div is found
      return dataIds
    }
  }

  /**
   * Perform questions
   */
  performQuestionToLLM (node) {
    Alerts.showLoadingWindow('Creating prompt...')
    let that = this
    this.parseMap().then(() => {
      let questionNode, nodeId
      if (node._domElement) {
        node = node._domElement
      }
      if (node.dataset) {
        questionNode = that._mindmapParser.getNodeById(node.dataset.id)
        nodeId = node.dataset.id
      }
      let question = questionNode._info.title.replaceAll('\n', ' ')
      let prompt = PromptBuilder.getPromptForLLMAnswers(this, question)
      let title, note
      if (questionNode._info.parent) {
        const parent = that._mindmapParser.getNodeById(questionNode._info.parent)
        if (parent._info.note) {
          note = parent._info.note.replaceAll('\n', ' ')
        }
        title = parent._info.title.replaceAll('\n', ' ')
        if (note !== '' || note !== null) {
          prompt = title + ' means that ' + note + '\n Based on that,' + prompt
        }
      }
      console.log('prompt:\n ' + prompt)
      chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getSelectedLLM' }, async ({ llm }) => {
        if (llm === '') {
          llm = Config.defaultLLM
        }
        Alerts.showLoadingWindow('Waiting for ' + llm.charAt(0).toUpperCase() + llm.slice(1) + 's answer...')
        chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getAPIKEY', data: llm }, ({ apiKey }) => {
          if (apiKey !== null && apiKey !== '') {
            let callback = (json) => {
              Alerts.closeLoadingWindow()
              let gptItemsNodes = that.parseChatGPTAnswer(json)
              if (gptItemsNodes === null || gptItemsNodes.length === 0) {
                Alerts.showErrorToast(`There was an error parsing ChatGPT's answer. Check browser console to see the whole answer.`)
              }
              let nodes
              // GPT Answers
              gptItemsNodes = gptItemsNodes.map((c) => {
                return {
                  text: c.label,
                  style: PromptStyles.SystemAnswerItem,
                  image: IconsMap['magnifier'],
                  parentId: nodeId,
                  note: c.description + '\n\n<b>Source: ' + llm + '</b>'
                }
              })
              nodes = gptItemsNodes
              MindmeisterClient.addNodes(that._mapId, nodes).then((response) => {
                if (response.error) {
                  Alerts.showErrorToast('There was an error adding the nodes to the map')
                } else {
                  Alerts.closeLoadingWindow()
                  let title = document.querySelectorAll('.plusTitle')
                  if (title) {
                    title.forEach((t) => {
                      t.remove()
                    })
                  }
                }
              })
            }
            LLMClient.simpleQuestion({
              apiKey: apiKey,
              prompt: prompt,
              llm: llm,
              callback: callback
            })
          } else {
            Alerts.showErrorToast('No API key found for ' + llm)
          }
        })
      })
    })
  }
  performPDFBasedQuestion (node, id, name) {
    Alerts.showLoadingWindow(`Creating prompt...`)
    let that = this
    let chatGPTBasedAnswers = false
    this.parseMap().then(() => {
      let prompt = PromptBuilder.getPromptForPDFBasedQuestion(this, node.text, chatGPTBasedAnswers)
      let title = null
      let note = null
      let questionNode = that._mindmapParser.getNodeById(node.id)
      if (!questionNode._info.title.startsWith('WHICH')) {
        const parent = that._mindmapParser.getNodeById(questionNode._info.parent)
        note = parent._info.note.replaceAll('\n', ' ')
        title = parent._info.title.replaceAll('\n', ' ')
      }
      if (note !== null) {
        prompt = title + ' means that ' + note + '\n Based on that,' + prompt
      }
      console.log('prompt: ' + prompt)
      // Ensure workerSrc is set before loading the document
      // eslint-disable-next-line no-undef
      PDFJS.workerSrc = chrome.runtime.getURL('resources/pdfjs/build/pdf.worker.js')
      MindmeisterClient.getToken().then(token => {
        var myHeaders = new Headers()
        myHeaders.append('accept', 'application/pdf') // Changed to 'application/pdf'
        var requestOptions = {
          method: 'GET',
          headers: myHeaders,
          redirect: 'follow'
        }
        fetch('https://www.mindmeister.com/api/v2/files/' + id + '/attachment?access_token=' + token, requestOptions)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            } else {
              return response.arrayBuffer()
            }
          })
          .then(pdfData => {
            // eslint-disable-next-line no-undef
            PDFJS.getDocument({ data: pdfData }).promise.then(async pdfDocument => {
              let documents = []
              documents = await LLMTextUtils.loadDocument(pdfDocument)
              chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getSelectedLLM' }, async ({ llm }) => {
                if (llm === '') {
                  llm = Config.defaultLLM
                }
                Alerts.showLoadingWindow('Waiting for ' + llm.charAt(0).toUpperCase() + llm.slice(1) + 's answer...')
                chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getAPIKEY', data: llm }, ({ apiKey }) => {
                  if (apiKey !== null && apiKey !== '') {
                    let callback = (json) => {
                      Alerts.closeLoadingWindow()
                      const {
                        gptItemsNodes,
                        pdfBasedItemsNodes
                      } = that.parseChatGPTAnswerFromJSON(json, chatGPTBasedAnswers)
                      if ((gptItemsNodes === null || gptItemsNodes.length === 0) && pdfBasedItemsNodes.length === 0) {
                        Alerts.showErrorToast(`There was an error parsing ChatGPT's answer. Check browser console to see the whole answer.`)
                      }
                      let nodes
                      // PDF Answers
                      let otherProblemsNodes = pdfBasedItemsNodes.map((c) => {
                        return {
                          text: c.label,
                          style: PromptStyles.AnswerItemPDFBased,
                          image: IconsMap['tick-disabled'],
                          parentId: node.id,
                          note: c.description + '\n\n EXCERPT FROM ' + name + ':\n' + c.excerpt
                        }
                      })
                      if (chatGPTBasedAnswers) {
                        // GPT Answers
                        let gptProblemsNodes = gptItemsNodes.map((c) => {
                          return {
                            text: c.label,
                            style: PromptStyles.UserAnswerItem,
                            image: IconsMap['tick-disabled'],
                            parentId: node.id,
                            note: c.description
                          }
                        })
                        nodes = otherProblemsNodes.concat(gptProblemsNodes)
                      } else {
                        nodes = otherProblemsNodes
                      }
                      if (questionNode._info.title.startsWith('WHICH')) {
                        let narrative = that.getNarrative(that, questionNode)
                        if (narrative.problem) {
                          let problems = narrative.problem.split(';')
                          problems.pop()
                          let currentProblem = problems.pop().split(':')
                          nodes.push({
                            text: currentProblem[0],
                            style: PromptStyles.UserAnswerItem,
                            image: IconsMap['tick-disabled'],
                            parentId: node.id,
                            note: currentProblem[1]
                          })
                        }
                      }
                      MindmeisterClient.addNodes(that._mapId, nodes).then((response) => {
                        if (response.error) {
                          Alerts.showAlertToast('There was an error adding the nodes to the map')
                        } else {
                          Alerts.closeLoadingWindow()
                          if (title) {
                            title.forEach((t) => {
                              t.remove()
                            })
                          }
                          let title2 = document.querySelectorAll('.plusTitleOwn')
                          if (title2) {
                            title2.forEach((t) => {
                              t.remove()
                            })
                          }
                        }
                      })
                    }
                    LLMClient.pdfBasedQuestion({
                      apiKey: apiKey,
                      documents: documents,
                      prompt: prompt,
                      llm: llm,
                      callback: callback
                    })
                  } else {
                    Alerts.showErrorToast('No API key found for ChatGPT')
                  }
                })
              })
            }).catch(error => {
              console.error('Error in processing PDF: ', error)
              Alerts.showErrorToast('Error in processing PDF: ' + error.message)
            })
          })
          .catch(error => {
            console.error('Error getting attached file:', error)
            Alerts.showErrorToast('Error getting attached file: ' + error.message)
          })
      }).catch(error => {
        console.error('Error getting token:', error)
        Alerts.showErrorToast('Error getting token: ' + error.message)
      })
    }).catch(error => {
      console.error('Error parsing map:', error)
      Alerts.showErrorToast('Error parsing map: ' + error.message)
    })
  }
  performAggregationQuestion (node) {
    Alerts.showLoadingWindow('Creating prompt...')
    let that = this
    let prompt = ''
    let childrenNodes = node.children
    if (childrenNodes.length > 2) {
      Alerts.askUserNumberOfClusters(childrenNodes.length, (err, number) => {
        if (err) {
          Alerts.showErrorToast('An error occurred')
        } else {
          if (childrenNodes.length > 0) {
            prompt = PromptBuilder.getPromptForAggregation(node.text, childrenNodes, number)
            console.log('prompt: ' + prompt)
            chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getSelectedLLM' }, async ({ llm }) => {
              if (llm === '') {
                llm = Config.defaultLLM
              }
              Alerts.showLoadingWindow('Waiting for ' + llm.charAt(0).toUpperCase() + llm.slice(1) + 's answer...')
              chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getAPIKEY', data: llm }, ({ apiKey }) => {
                if (apiKey !== null && apiKey !== '') {
                  let callback = (json) => {
                    Alerts.closeLoadingWindow()
                    console.log(json)
                    const gptItemsNodes = that.parseChatGPTAnswerFromAggregation(json)
                    if (gptItemsNodes === null || gptItemsNodes.length === 0) {
                      Alerts.showErrorToast(`There was an error parsing ChatGPT's answer. Check browser console to see the whole answer.`)
                    }
                    let nodes
                    // GPT Answers
                    let gptProblemsNodes = gptItemsNodes.map((c) => {
                      return {
                        text: c.label,
                        style: PromptStyles.AnswerItemAggregation,
                        image: IconsMap['tick-disabled'],
                        parentId: node.id,
                        note: c.description
                      }
                    })
                    nodes = gptProblemsNodes
                    let removeNodes = childrenNodes.map((c) => {
                      return {
                        id: c._info.id
                      }
                    })
                    MindmeisterClient.removeNodes(that._mapId, removeNodes).then((response) => {
                      if (response.error) {
                        Alerts.showAlertToast('There was an error removing the nodes from the map')
                      } else {
                        MindmeisterClient.addNodes(that._mapId, nodes).then((response) => {
                          if (response.error) {
                            Alerts.showAlertToast('There was an error adding the nodes to the map')
                          } else {
                            Alerts.closeLoadingWindow()
                            let title = document.querySelectorAll('.plusTitle')
                            if (title) {
                              title.forEach((t) => {
                                t.remove()
                              })
                            }
                            let title2 = document.querySelectorAll('.plusTitleOwn')
                            if (title2) {
                              title2.forEach((t) => {
                                t.remove()
                              })
                            }
                          }
                        })
                      }
                    })
                  }
                  LLMClient.simpleQuestion({
                    apiKey: apiKey,
                    prompt: prompt,
                    llm: llm,
                    callback: callback
                  })
                } else {
                  Alerts.showErrorToast('No API key found for ' + llm)
                }
              })
            })
          }
        }
      })
    }
    console.log(prompt)
  }
  retrieveLLMSuggestedQuestion (that, nodeId, prompt) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getSelectedLLM' }, async ({ llm }) => {
        if (llm === '') {
          llm = Config.defaultLLM
        }
        Alerts.showLoadingWindow('Waiting for ' + llm.charAt(0).toUpperCase() + llm.slice(1) + 's answer...')
        chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getAPIKEY', data: llm }, ({ apiKey }) => {
          if (apiKey !== null && apiKey !== '') {
            let callback = (json) => {
              Alerts.closeLoadingWindow()
              let gptItemsNodes = that.parseChatGPTAnswer(json)
              if (gptItemsNodes === null || gptItemsNodes.length === 0) {
                Alerts.showErrorToast(`There was an error parsing ChatGPT's answer. Check browser console to see the whole answer.`)
              }
              // GPT Answers
              gptItemsNodes = gptItemsNodes.map((c) => {
                return {
                  text: c.label,
                  style: PromptStyles.SystemQuestionItem,
                  image: IconsMap['question'],
                  parentId: nodeId,
                  note: c.description + '\n\n<b>Source: ' + llm + '</b>'
                }
              })
              resolve(gptItemsNodes)
            }
            LLMClient.simpleQuestion({
              apiKey: apiKey,
              prompt: prompt,
              llm: llm,
              callback: callback
            })
          } else {
            reject(new Error('No API key found for ' + llm))
          }
        })
      })
    })
  }
  retrieveModelSuggestedQuestions (that, nodeId, prompt, modelName) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getSelectedLLM' }, async ({ llm }) => {
        if (llm === '') {
          llm = Config.defaultLLM
        }
        Alerts.showLoadingWindow('Waiting for ' + llm.charAt(0).toUpperCase() + llm.slice(1) + 's answer...')
        chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getAPIKEY', data: llm }, ({ apiKey }) => {
          if (apiKey !== null && apiKey !== '') {
            let callback = (json) => {
              Alerts.closeLoadingWindow()
              let gptItemsNodes = that.parseChatGPTAnswer(json)
              if (gptItemsNodes === null || gptItemsNodes.length === 0) {
                Alerts.showErrorToast(`There was an error parsing ChatGPT's answer. Check browser console to see the whole answer.`)
              }
              // GPT Answers
              gptItemsNodes = gptItemsNodes.map((c) => {
                return {
                  text: c.label,
                  style: PromptStyles.SystemQuestionItem,
                  image: IconsMap['question'],
                  parentId: nodeId,
                  note: c.description + '\n\n<b>Source: ' + modelName + '</b>'
                }
              })
              resolve(gptItemsNodes)
            }
            LLMClient.simpleQuestion({
              apiKey: apiKey,
              prompt: prompt,
              llm: llm,
              callback: callback
            })
          } else {
            reject(new Error('No API key found for ' + llm))
          }
        })
      })
    })
  }
  /**
   * Parse answers
   */
  parseChatGPTAnswer (json) {
    let gptItems
    gptItems = Array.from(Object.values(json)[0]).filter(item =>
      Object.keys(item).some(key => key.startsWith('GPT_'))
    )
    let gptItemsNodes = []
    gptItems.forEach((item) => {
      let name = Utils.findValuesEndingWithName(item, 'name')
      gptItemsNodes.push({ label: name, description: item.description })
    })
    return gptItemsNodes
  }
  parseChatGPTAnswerFromJSON (json, chatGPTBasedAnswers) {
    let gptItems
    if (chatGPTBasedAnswers) {
      gptItems = Array.from(Object.values(json)[0]).filter(item =>
        Object.keys(item).some(key => key.startsWith('GPT_'))
      )
    }
    const pdfBasedItems = Array.from(Object.values(json)[0]).filter(item =>
      !Object.keys(item).some(key => key.startsWith('GPT_'))
    )
    let gptItemsNodes = []
    let pdfBasedItemsNodes = []
    if (chatGPTBasedAnswers) {
      gptItems.forEach((item) => {
        let name = Utils.findValuesEndingWithName(item, 'name')
        gptItemsNodes.push({ label: name, description: item.description })
      })
    } else {
      gptItemsNodes = null
    }
    pdfBasedItems.forEach((item) => {
      let name = Utils.findValuesEndingWithName(item, 'name')
      pdfBasedItemsNodes.push({label: name, excerpt: '<em>' + item.excerpt + '</em>', description: item.description})
    })
    return {gptItemsNodes, pdfBasedItemsNodes}
  }
  parseChatGPTAnswerFromAggregation (json) {
    let clusters
    clusters = Array.from(Object.values(json)[0]).filter(item =>
      Object.keys(item).some(key => key.startsWith('cluster_name'))
    )
    let clusterNodes = []
    clusters.forEach((item) => {
      let name = Utils.findValuesEndingWithName(item, 'name')
      let description = item.description + '\n'
      Array.from(item.clusteredItems).forEach((clusteredItem) => {
        description += '\n<strong>' + clusteredItem.node_name + '</strong>: ' + clusteredItem.description
      })
      clusterNodes.push({ label: name, description: description })
    })
    return clusterNodes
  }
  /**
   * Management of answer nodes
   */
  addAnswerClickManager () {
    let that = this
    let answerNodes = MindmapWrapper.getNodesByIcon('magnifier')
    answerNodes.forEach((n) => {
      let iconElement = n.getIconElement()
      if (iconElement == null || iconElement.classList.contains('chatin_answer')) return
      iconElement.classList.add('chatin_answer')
      iconElement.style.removeProperty('pointer-events')
      iconElement.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        that.provideQuestions(n)
      })
    })
  }
  provideQuestions (node) {
    Alerts.showLoadingWindow(`Loading...`)
    // GPT Answers
    let that = this

    that.parseMap().then(() => {
      let answerNode, nodeId
      if (node._domElement) {
        node = node._domElement
      }
      if (node.dataset) {
        answerNode = that._mindmapParser.getNodeById(node.dataset.id)
        nodeId = node.dataset.id
      }
      let answerNodeLabel = answerNode._info.title.replaceAll('\n', ' ')
      let answerNodeNote = answerNode._info.note
      let previousQuestionNodeLabel
      if (answerNode._info.parent) {
        const previousQuestionNode = that._mindmapParser.getNodeById(answerNode._info.parent)
        if (previousQuestionNode._info.title) {
          previousQuestionNodeLabel = previousQuestionNode._info.title.replaceAll('\n', ' ')
        }
      }
      // PROMPT FOR RETRIEVING SUGGESTED QUESTIONS
      let llmSuggestedQuestionsPrompt = PromptBuilder.getPromptForLLMSuggestedQuestions(this, answerNodeLabel, answerNodeNote, previousQuestionNodeLabel, that._firsQuestion)
      let models = Config.models
      const fromLLM = (that, nodeId, llmSuggestedQuestionsPrompt) => {
        return that.retrieveLLMSuggestedQuestion(that, nodeId, llmSuggestedQuestionsPrompt)
      }
      const fromModel = (that, nodeId, model) => {
        const modelSuggestedQuestionsPrompt = PromptBuilder.getPromptForModelSuggestedQuestion(this, answerNodeLabel, answerNodeNote, previousQuestionNodeLabel, that._firsQuestion, model)
        return that.retrieveModelSuggestedQuestions(that, nodeId, modelSuggestedQuestionsPrompt, model.name)
      }
      // Create a promise for the LLM and for each model dynamically
      const promises = [
        fromLLM(that, nodeId, llmSuggestedQuestionsPrompt),
        ...models.map(model => fromModel(that, nodeId, model))
      ]
      // Launch all methods separately and join the answers
      Promise.all(promises).then(results => {
        // Combine all results into one array
        let newQuestionNodes = []
        results.forEach(gptItemsNodes => {
          newQuestionNodes = newQuestionNodes.concat(gptItemsNodes)
        })
        // ADD USER QUESTION
        newQuestionNodes.push({
          text: 'Type here a following up question about ' + answerNodeLabel + ' ...',
          style: PromptStyles.UserQuestionItem,
          image: IconsMap['question'],
          parentId: nodeId,
          note: '<b>Question from User</b>'
        })
        MindmeisterClient.doActions(that._mapId, newQuestionNodes).then((response) => {
          if (response.error) {
            Alerts.showErrorToast('There was an error adding the node to the map')
          } else {
            Alerts.closeLoadingWindow()
          }
        })
      })
    })
  }
  addSiblingNode (that, node, type) {
    // let that = this
    let nodeId = node._info.parent
    if (type === 'questionNode') {
      MindmeisterClient.doActions(that._mapId, [{text: '<add your question>', parentId: nodeId, style: PromptStyles.QuestionPrompt, image: IconsMap.magnifier}]).then((response) => {
        if (response.error) {
          Alerts.showErrorToast('There was an error adding the node to the map')
        } else {
          Alerts.closeLoadingWindow()
        }
      })
    } else if (type === 'causeNode') {
      MindmeisterClient.doActions(that._mapId,
        [{text: '<add your cause>', parentId: nodeId, style: PromptStyles.UserAnswerItem, image: IconsMap['tick-disabled']}]
      ).then((response) => {
        if (response.error) {
          Alerts.showErrorToast('There was an error adding the node to the map')
        } else {
          Alerts.closeLoadingWindow()
        }
      })
    } else if (type === 'consequenceNode') {
      MindmeisterClient.doActions(that._mapId,
        [{text: '<add your consequence>', parentId: nodeId, style: PromptStyles.UserAnswerItem, image: IconsMap['tick-disabled']}]
      ).then((response) => {
        if (response.error) {
          Alerts.showErrorToast('There was an error adding the node to the map')
        } else {
          Alerts.closeLoadingWindow()
        }
      })
    }
  }
  /**
   * Mind map parsing
   */
  parseStyle (callback) {
    this._styles = []
    let styles = []
    chrome.runtime.sendMessage({ scope: 'parameterManager', cmd: 'getNumberOfAuthorsParameter' }, ({ parameter }) => {
      if (parameter && parameter !== '') {
        styles.push({name: 'Number of items', value: parameter})
        styles.push({name: 'Description', value: 'provide rationales'})
        this._styles = styles
        if (callback) callback()
      } else {
        document.querySelector('#numberOfAuthorsParameterInput').value = ITEMS
        styles.push({name: 'Number of items', value: ITEMS})
        styles.push({name: 'Description', value: 'provide rationales'})
        this._styles = styles
        if (callback) callback()
        // setNumberOfAuthorsParameter(3)
      }
    })
    // styles.push({name: 'Number of items', value: ITEMS})
  }
  parseProblem (problem) {
    let that = this
    let node = this._mindmapParser.getNodeById(problem.nodeId)
    if (node == null) return
    let problemNodeChildren = node.children
    let subproblemsPromptRE = MindmapManager.createRegexpFromPrompt(ProcessQuestions.PROBLEM_ANALYSIS)
    problemNodeChildren.forEach((c) => {
      if (subproblemsPromptRE.test(c.text)) {
        c.children.forEach((p) => {
          let subP = new Problem(p.text, p.id, problem)
          that._problems.push(p.text)
          problem.addSubproblem(subP)
          that.parseProblem(subP)
        })
      }
    })
    let consequencesPromptRE = MindmapManager.createRegexpFromPrompt(ProcessQuestions.CONSEQUENCE_MAPPING)
    problemNodeChildren.forEach((c) => {
      if (consequencesPromptRE.test(c.text)) {
        c.children.forEach((p) => {
          let cons = new Consequence(p.text, p.id, problem)
          problem.addConsequence(cons)
        })
      }
    })
  }
  parseMap () {
    let that = this
    return new Promise((resolve, reject) => {
      MindmeisterClient.getMap(that._mapId).then((mapInfo) => {
        that._mindmapParser = new MindmapContentParser(mapInfo)
        let rootNode = that.getRootNode()
        that._firsQuestion = rootNode._domElement.innerText.replaceAll('\n', ' ')
        that.parseStyle(() => {
          // that.parseScopingAnalysis()
          resolve()
        })
      })
    })
  }
  /**
   * Other functions
   */
  static extractQuestionItems (question) {
    let items = question.match(/<[^>]+>/g)
    if (items == null) return []
    return items.map((it) => it.replace(/</g, '').replace(/>/g, '').trim())
  }
  static createRegexpFromPrompt (text) {
    let questionPrompt = text.replace(/<[^>]+>/g, '.+').replace(/\?/g, '?')
    let promptRegExp = new RegExp(questionPrompt, 'gi')
    return promptRegExp
  }
  getCurrentNodeId () {
    let elements = Array.from(document.querySelectorAll('div')).filter(el => {
      let style = el.style
      return style.width === '7px' &&
        style.height === '7px' &&
        style.position === 'absolute' &&
        style.right === '-7px' &&
        style.bottom === '-7px' &&
        style.cursor === 'ew-resize' &&
        style.pointerEvents === 'auto' &&
        style.borderRadius === '100%' &&
        style.backgroundColor === 'white' &&
        style.boxSizing === 'content-box' &&
        style.borderStyle === 'solid' &&
        style.borderWidth === '2px' &&
        style.borderColor === 'rgb(0, 170, 255)'
    })
    let originalElement = elements.length > 0 ? elements[0] : null
    let transform = originalElement.parentElement.style.transform
    // eslint-disable-next-line no-useless-escape
    let match = /translateX\((\d+)px\)\s*translateY\((\-?\d+)px\)/.exec(transform)
    let targetElement = null
    if (match) {
      let translateX = parseInt(match[1]) + 2
      let translateY = parseInt(match[2]) + 2

      // Step 2: Find Another Element with the Modified Values
      let modifiedTransform = `translateX(${translateX}px) translateY(${translateY}px)`
      targetElement = document.querySelector(`div[style*='${modifiedTransform}']`)

      if (targetElement) {
        console.log('Element found with modified transform values:', targetElement)
        return targetElement.getAttribute('data-id')
      } else {
        console.log('No element found with the specified transform values.')
      }
    } else {
      console.log('Original element with specified transform values not found.')
    }
    return targetElement
  }
  getCurrentNode () {
    let elements = Array.from(document.querySelectorAll('div')).filter(el => {
      let style = el.style
      return style.width === '7px' &&
        style.height === '7px' &&
        style.position === 'absolute' &&
        style.right === '-7px' &&
        style.bottom === '-7px' &&
        style.cursor === 'ew-resize' &&
        style.pointerEvents === 'auto' &&
        style.borderRadius === '100%' &&
        style.backgroundColor === 'white' &&
        style.boxSizing === 'content-box' &&
        style.borderStyle === 'solid' &&
        style.borderWidth === '2px' &&
        style.borderColor === 'rgb(0, 170, 255)'
    })
    let originalElement = elements.length > 0 ? elements[0] : null
    let transform = originalElement.parentElement.style.transform
    // eslint-disable-next-line no-useless-escape
    let match = /translateX\((\d+)px\)\s*translateY\((\-?\d+)px\)/.exec(transform)
    let targetElement = null
    if (match) {
      let translateX = parseInt(match[1]) + 2
      let translateY = parseInt(match[2]) + 2

      // Step 2: Find Another Element with the Modified Values
      let modifiedTransform = `translateX(${translateX}px) translateY(${translateY}px)`
      targetElement = document.querySelector(`div[style*='${modifiedTransform}']`)

      if (targetElement) {
        console.log('Element found with modified transform values:', targetElement)
        return targetElement
      } else {
        console.log('No element found with the specified transform values.')
      }
    } else {
      console.log('Original element with specified transform values not found.')
    }
    return targetElement
  }
  isQuestionNode (questionNode) {
    let questionRegExp = /^(WHICH|HOW|WHY).+\?$/i
    let question = questionNode.innerText.replaceAll('\n', ' ')
    if (questionRegExp.test(question)) {
      return true
    } else {
      return false
    }
  }
  isAnswerNode (questionNode) {
    if (questionNode.style.backgroundColor === 'rgb(150, 219, 11)' || questionNode.style.backgroundColor === 'rgb(0, 192, 0)' || questionNode.style.backgroundColor === 'rgb(0, 128, 0)' || questionNode.style.backgroundColor === 'rgb(194, 24, 7)' || questionNode.style.backgroundColor === 'rgb(248, 230, 157)') {
      return true
    } else {
      return false
    }
  }
  isAddressProblemNode (questionNode) {
    if (questionNode.style.backgroundColor === 'rgb(194, 24, 7)') {
      return true
    } else {
      return false
    }
  }
  isGoodnessCriteriaNode (that, questionNode, questionNodeObject) {
    if (questionNode.style.backgroundColor === 'rgb(0, 170, 255)' && !that.isInContext(that, questionNodeObject)) {
      return true
    } else {
      return false
    }
  }
  isInContext (that, questionNode) {
    let parent = that._mindmapParser.getNodeById(questionNode._info.parent)
    while (parent !== null) {
      if (parent._info.title === TemplateNodes.CONTEXT) {
        return true
      } else {
        parent = that._mindmapParser.getNodeById(parent._info.parent)
      }
    }
    return false
  }
  canBeAggregated (questionNode) {
    const hasChildWithChildren = questionNode.children.some((child) => {
      return child.children && child.children.length > 0
    })
    return hasChildWithChildren
  }

  findIssue (text, nodeId) {
    let id = nodeId > 0 ? nodeId : null
    for (let i = 0; i < this._scopingAnalysis.length; i++) {
      let issue = this._scopingAnalysis[i].findIssue(text, id)
      if (issue != null) return issue
    }
    return null
  }
  addObserverToAddButton () {
    // Select the node that you want to observe
    const targetNode = document.querySelector('.addButton')
    // Options for the observer (which mutations to observe)
    const config = { attributes: true, attributeOldValue: true }
    // Callback function to execute when mutations are observed
    const callback = function (mutationsList, observer) {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes') {
          if (mutation.attributeName === 'style') {
            Utils.reloadLabels()
          }
        }
      }
    }
    // Create an instance of MutationObserver
    const observer = new MutationObserver(callback)
    // Start observing the target node for configured mutations
    observer.observe(targetNode, config)
  }
}

module.exports = MindmapManager
