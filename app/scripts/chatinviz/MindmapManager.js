// import * as pdfjsLib from 'pdfjs-dist/webpack';
const Config = require('../Config')
const LLMTextUtils = require('../utils/LLMTextUtils')
const LLMClient = require('../llm/LLMClient')
const MindmapWrapper = require('../mindmeister/wrapper/MindmapWrapper')
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

class MindmapManager {
  constructor () {
    this._mapId = null
    this._mindmapParser = null
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
      this.initManagers(that)
    })
  }
  getRootNode () {
    let urlRegexp = /https?:\/\/www\.mindmeister\.com\/(map|app\/map)\/(\d+)($|\/|\?|#)/
    let m = window.location.href.match(urlRegexp)
    if (m == null || m.length < 3) return
    let nodeId = m[2]
    return MindmapWrapper.getNodeById(nodeId)
  }
  getRootNodeID () {
    let urlRegexp = /https?:\/\/www\.mindmeister\.com\/(map|app\/map)\/(\d+)($|\/|\?|#)/
    let m = window.location.href.match(urlRegexp)
    if (m == null || m.length < 3) return
    let nodeId = m[2]
    return nodeId
  }
  isChatinVizMap (rootNode) {
    // Save if it is a ChatinViz map
    return new Promise((resolve, reject) => {
      if (CheckMapUtils.nodeElementHasQuestionMark(rootNode) && CheckMapUtils.mindmapNodeHasRectangleShape(rootNode)) {
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
        this.addConfigurationButton()
        that.addQuestionClickManager()
        that.addAnswerClickManager()
        that.addUserAnnotations(this._mapId)
      }
    })
    let config = { childList: true, subtree: true }
    obs.observe(parent, config)
    // obs.observe(document, config)
    this.addConfigurationButton()
    this.addQuestionClickManager()
    this.addAnswerClickManager()
    this.addUserAnnotations(this._mapId)
  }
  addConfigurationButton () {
    let configurationButton = document.querySelector('.chatin-configuration-button')
    if (configurationButton == null) {
      let button = document.querySelector('.topRightToolbar-btnShare')

      // Clone the button element
      let clone = button.cloneNode(true)
      clone.querySelector('.kr-text[data-test-id="icon-text-button-text"]').textContent = 'Question Configuration'
      // Check if the button exists and has the expected text
      clone.className = 'chatin-configuration-button'
      clone.addEventListener('click', function (event) {
        event.stopPropagation()
        window.open(chrome.runtime.getURL('/pages/modelConfiguration.html'), '_blank')
      })
      // Insert the cloned button before the original button
      button.parentNode.insertBefore(clone, button)
    }
  }
  addUserAnnotations (mapId) {
    let that = this
    chrome.runtime.sendMessage({ scope: 'ratingManager', cmd: 'getRatings' }, (data) => {
      let currentRatedNodes = data.ratings.filter(r => r.mapID === mapId)
      currentRatedNodes.forEach((r) => {
        if (r.userAnnotation && r.userAnnotation !== '') {
          let node = MindmapWrapper.getNodeById(r.nodeID)
          if (!node._domElement.classList.contains('userAnnotationTag')) {
            let nodeTitleDiv = node._domElement.querySelector('.node-title')
            if (nodeTitleDiv) {
              var nextSibling = nodeTitleDiv.nextElementSibling // This gets the next sibling element
              if (nextSibling) {
                var duplicate = nextSibling.cloneNode(true)
                // Add the class 'userAnnotationTag'
                node._domElement.classList.add('userAnnotationTag')
                // Change the color to rating.value.color (assuming 'rating.value.color' is available)
                let child = duplicate.querySelector('.kr-text')
                child.style.backgroundColor = PromptStyles[r.ratingValue].borderColor
                // Add a click listener to the duplicated element
                duplicate.addEventListener('click', function () {
                  // Additional actions can be performed here on click
                  const selector = '#modal_' + r.nodeID
                  let currentModal = nodeTitleDiv.querySelector(selector)
                  if (currentModal) {
                    currentModal.remove()
                  } else {
                    that.showModal(r, nodeTitleDiv)
                  }
                })
                // Insert the duplicate into the DOM, after the original nextSibling
                nextSibling.parentNode.insertBefore(duplicate, nextSibling.nextSibling)
                // You can now work with the next sibling element
              }
            }
          }
        }
      })
    })
  }
  addUserAnnotation (mapID, r) {
    let that = this
    if (r.userAnnotation && r.userAnnotation !== '') {
      let node = MindmapWrapper.getNodeById(r.nodeID)
      let nodeTitleDiv = node._domElement.querySelector('.node-title')
      if (node._domElement.classList.contains('userAnnotationTag')) {
        let toRemove = nodeTitleDiv.nextElementSibling.nextElementSibling
        toRemove.remove()
      }
      if (nodeTitleDiv) {
        var nextSibling = nodeTitleDiv.nextElementSibling // This gets the next sibling element
        if (nextSibling) {
          console.log('Next sibling element:', nextSibling)
          var duplicate = nextSibling.cloneNode(true)
          // Add the class 'userAnnotationTag'
          if (!node._domElement.classList.contains('userAnnotationTag')) {
            node._domElement.classList.add('userAnnotationTag')
          }
          // Change the color to rating.value.color (assuming 'rating.value.color' is available)
          let child = duplicate.querySelector('.kr-text')
          child.style.backgroundColor = PromptStyles[r.ratingValue].borderColor
          // Add a click listener to the duplicated element
          duplicate.addEventListener('click', function () {
            console.log('Duplicated element clicked')
            // Additional actions can be performed here on click
            const selector = '#modal_' + r.nodeID
            let currentModal = nodeTitleDiv.querySelector(selector)
            if (currentModal) {
              currentModal.remove()
            } else {
              that.showModal(r, nodeTitleDiv)
            }
          })
          // Insert the duplicate into the DOM, after the original nextSibling
          nextSibling.parentNode.insertBefore(duplicate, nextSibling.nextSibling)
          // You can now work with the next sibling element
        } else {
          console.log('No next sibling element found.')
        }
      }
    }
  }

  showModal (r, nodeTitleDiv) {
    // Create modal HTML
    let modal = document.createElement('div')
    modal.style.cssText = 'z-index:1000;background-color:white;width:100%;height:100%;margin-left:10px;color: black; display: flex; align-items: center; justify-content: center; border-color: black; border-width: 1px; border-style: solid;'
    modal.innerText = r.userAnnotation
    modal.id = 'modal_' + r.nodeID
    // Append modal to body
    nodeTitleDiv.appendChild(modal)

    // Add click event to close button
    modal.addEventListener('click', function () {
      modal.remove()
    })
  }

  /**
   *  Manage editor changes
   */
  manageAttachmentsMenu (that, attachmentDiv, currentNode) {
    // Example usage
    const classNames = Utils.extractNumbersFromClassNames(attachmentDiv.innerHTML)
    if (classNames.length > 0) {
      const window = attachmentDiv.querySelector('.knightrider-scrollview-scrollelement')
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
            let questionNodeID = currentNode.getAttribute('data-id')
            let questionNode = MindmapWrapper.getNodeById(questionNodeID)
            if (id && name && questionNode) {
              that.perform_DataSourcePDF_Question(questionNode, id, name)
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
      if ((div.textContent.includes('Icon') || div.textContent.includes('Icono')) && div.getAttribute('style') === expectedStyle) {
        let questionNode = that.getCurrentNode()
        // ADD SUMMARIZE BUTTON
        let aggregateButton = div.cloneNode(true)
        // Optionally, you can change the content or attributes of the duplicate
        aggregateButton.textContent = 'Summarize'
        aggregateButton.style = 'width: 100%; margin-bottom: 10px; padding-top: 7px; padding-bottom: 7px; flex-direction: column; align-items: center; justify-content: center; border-radius: 10px; background-color: rgba(0, 0, 0, 0.05); cursor: pointer; transform: scaleX(1) scaleY(1);'
        // Insert the duplicate after the original div
        div.parentNode.insertBefore(aggregateButton, aggregateButton.nextSibling)
        aggregateButton.addEventListener('click', function (event) {
          that.parseMap().then(() => {
            let questionNodeObject = that._mindmapParser.getNodeById(questionNode.getAttribute('data-id'))
            let type = MindmapWrapper.getTypeOfNode(questionNode)
            if (that.canBeAggregated(questionNodeObject)) {
              Alerts.infoAlert({
                title: 'Summarizing nodes',
                text: 'This operation will remove relevant information within the aggregated nodes. Do you want to continue?',
                showCancelButton: true,
                confirmButtonText: 'Yes',
                cancelButtonText: 'No',
                callback: () => {
                  that.performSummarizationQuestion(questionNodeObject, type)
                }
              })
            } else {
              that.performSummarizationQuestion(questionNodeObject, type)
            }
          })
        })
        // ADD CONSENSUS BUTTON
        /* let consensusButton = div.cloneNode(true)
        // Optionally, you can change the content or attributes of the duplicate
        consensusButton.textContent = 'Consensus'
        consensusButton.style = 'width: 100%; margin-bottom: 10px; padding-top: 7px; padding-bottom: 7px; flex-direction: column; align-items: center; justify-content: center; border-radius: 10px; background-color: rgba(0, 0, 0, 0.05); cursor: pointer; transform: scaleX(1) scaleY(1);'
        // Insert the duplicate after the original div
        div.parentNode.insertBefore(consensusButton, div.nextSibling)
        consensusButton.addEventListener('click', function (event) {
          console.log('click on Consensus')
          that.parseMap().then(() => {
            let questionNodeObject = that._mindmapParser.getNodeById(questionNode.getAttribute('data-id'))
            const nodeText = questionNodeObject._info.title
            const encodedUri = encodeURIComponent(nodeText)
            const uri = 'https://consensus.app/results/?q=' + encodedUri
            window.open(uri)
            console.log('click on Consensus')
          })
        }) */
        // ADD USER FEEDBACK BUTTON
        let userFeedbackButton = div.cloneNode(true)
        // Optionally, you can change the content or attributes of the duplicate
        userFeedbackButton.textContent = 'UserFeedback'
        userFeedbackButton.style = 'width: 100%; margin-bottom: 10px; padding-top: 7px; padding-bottom: 7px; flex-direction: column; align-items: center; justify-content: center; border-radius: 10px; background-color: rgba(0, 0, 0, 0.05); cursor: pointer; transform: scaleX(1) scaleY(1);'
        // Insert the duplicate after the original div
        div.parentNode.insertBefore(userFeedbackButton, div.nextSibling)
        userFeedbackButton.addEventListener('click', function (event) {
          console.log('click on userFeedbackButton')
          that.parseMap().then(() => {
            let questionNodeObject = that._mindmapParser.getNodeById(questionNode.getAttribute('data-id'))
            chrome.runtime.sendMessage({ scope: 'ratingManager', cmd: 'getRatings' }, (data) => { // Find a rating that matches the mapID and nodeID
              let rating = null
              let ratings = data.ratings
              if (ratings.length > 0) {
                rating = ratings.find(r => r.mapID === that._mapId && r.nodeID === questionNode.getAttribute('data-id'))
              }
              if (rating) {
                console.log('Rating found:', rating)
                that.editFeedback(questionNodeObject, that._mapId, rating, ratings)
                // You can perform further actions with the found rating here
              } else {
                that.newFeedback(questionNodeObject, that._mapId, ratings)
                console.log('No rating found for the specified mapID and nodeID')
              }
            })
          })
        })
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
        that.perform_DataSourceLMM_Question(n)
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
  // eslint-disable-next-line camelcase
  perform_DataSourceLMM_Question (node) {
    chrome.runtime.sendMessage({ scope: 'parameters', cmd: 'getParameters' }, async (data) => {
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
        prompt = that.addPreviousNoteToPrompt(that, prompt, questionNode)
        let previousAnswer = ''
        if (questionNode._info.parent) {
          const parent = that._mindmapParser.getNodeById(questionNode._info.parent)
          previousAnswer = parent._info.title.replaceAll('\n', ' ')
        }
        let action
        if (CheckMapUtils.nodeElementHasRectangleShape(node) && !that.isRootNode(node)) {
          action = 'addQuestion'
        } else if (that.isRootNode(node)) {
          action = 'selectQuestion'
        } else {
          action = 'firstQuestion'
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
                // ADD USER ANSWER
                if (data.parameters.userProvidedAnswer) {
                  nodes.push({
                    text: 'Type here your answer ...',
                    style: PromptStyles.UserAnswerItem,
                    image: IconsMap['magnifier'],
                    parentId: nodeId,
                    note: '<b>Answer from User</b>'
                  })
                }
                MindmeisterClient.addNodes(that._mapId, nodes).then((response) => {
                  if (response.error) {
                    Alerts.showErrorToast('There was an error adding the nodes to the map')
                  } else {
                    let log = { action: action, mapId: that._mapId, nodeID: nodeId, value: {question: question, answer: previousAnswer}, user: 'default', timestamp: Date.now() }
                    that.pushLog(log)
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
    })
  }
  // eslint-disable-next-line camelcase
  perform_DataSourcePDF_Question (node, id, name) {
    chrome.runtime.sendMessage({ scope: 'parameters', cmd: 'getParameters' }, async (data) => {
      Alerts.showLoadingWindow(`Creating prompt...`)
      let that = this
      this.parseMap().then(() => {
        let prompt = PromptBuilder.getPromptForPDFAnswers(this, node.text)
        let questionNode = that._mindmapParser.getNodeById(node.id)
        prompt = that.addPreviousNoteToPrompt(that, prompt, questionNode)
        let previousAnswer = ''
        if (questionNode._info.parent) {
          const parent = that._mindmapParser.getNodeById(questionNode._info.parent)
          previousAnswer = parent._info.title.replaceAll('\n', ' ')
        }
        let action
        if (CheckMapUtils.nodeElementHasRectangleShape(node) && !that.isRootNode(node)) {
          action = 'addQuestionWithPDF'
        } else if (that.isRootNode(node)) {
          action = 'selectQuestionWithPDF'
        } else {
          action = 'firstQuestionWithPDF'
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
                        const answers = that.parseChatGPTAnswer(json, true)
                        if (answers === null || answers.length === 0) {
                          Alerts.showErrorToast(`There was an error parsing ChatGPT's answer. Check browser console to see the whole answer.`)
                        }
                        // PDF Answers
                        let nodes = answers.map((c) => {
                          return {
                            text: c.label,
                            style: PromptStyles.SystemAnswerItem,
                            image: IconsMap['magnifier'],
                            parentId: node.id,
                            note: c.description + '\n\n <b>Source: ' + name + ':</b>\n' + c.excerpt,
                            attachment: id
                          }
                        })
                        // ADD USER ANSWER
                        if (data.parameters.userProvidedAnswer) {
                          nodes.push({
                            text: 'Type here your answer ...',
                            style: PromptStyles.UserAnswerItem,
                            image: IconsMap['magnifier'],
                            parentId: node.id,
                            note: '<b>Answer from User</b>'
                          })
                        }
                        MindmeisterClient.addNodes(that._mapId, nodes).then((response) => {
                          if (response.error) {
                            Alerts.showAlertToast('There was an error adding the nodes to the map')
                          } else {
                            let log = { action: action, mapId: that._mapId, nodeID: node.id, value: {question: questionNode._info.title, answer: previousAnswer}, user: 'default', timestamp: Date.now() }
                            that.pushLog(log)
                            Alerts.closeLoadingWindow()
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
    })
  }
  performSummarizationQuestion (node, type) {
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
            let style, icon
            if (type === 'answer') {
              let answer = node.text + ' which means that ' + node._info.note.replace(/EXCERPT FROM[\s\S]*/, '')
              prompt = PromptBuilder.getPromptForSummarizationQuestions(answer, childrenNodes, number)
              style = PromptStyles.SystemQuestionItem
              icon = IconsMap['question']
            } else if (type === 'question') {
              prompt = PromptBuilder.getPromptForSummarizationAnswers(node.text, childrenNodes, number)
              style = PromptStyles.SystemAnswerItem
              icon = IconsMap['abcd']
            }
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
                        style: style,
                        image: icon,
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
  newFeedback (node, mapID, ratings) {
    let nodeID = node._info.id
    let userAnnotation
    let ratingValue
    let html = '<div>' + '<span style="text-align: left;">Rating ' + node._info.title + '</span>' +
      '<div>' +
      '<span style="text-align: left;">User Annotation</span>' +
      '<textarea id="userAnnotation" class="swal2-input customizeInput" placeholder="Provide your feedback"></textarea>' +
      '</div>'
    html += '<span style="text-align:left">Rating (1-5):</span><input type="number" min="1" max="5" id="ratingValue" class="swal2-input customizeInput" placeholder="Rate the node"></input></div>'
    Alerts.threeOptionsAlert({
      title: 'Creating feedback',
      html: html,
      showDenyButton: false,
      willOpen: () => {
        let element = document.querySelector('.swal2-popup')
        element.style.width = '900px'
      },
      preConfirm: () => {
        // Retrieve values from inputs
        userAnnotation = document.getElementById('userAnnotation').value
        ratingValue = document.getElementById('ratingValue').value
        if (!ratingValue) {
          // Throw an error or reject a promise to prevent closing the alert
          const swal = require('sweetalert2')
          swal.showValidationMessage('Please provide a rating.') // This will display an error message in the SweetAlert
          return false // Prevents the alert from closing
        } else if (ratingValue < 1 || ratingValue > 5) {
          const swal = require('sweetalert2')
          swal.showValidationMessage('Please provide a rating between 1 and 5.') // This will display an error message in the SweetAlert
          return false // Prevents the alert from closing
        }
      },
      callback: () => {
        // Save model
        let rating = {mapID: mapID, nodeID: nodeID, userAnnotation: userAnnotation, ratingValue: ratingValue}
        ratings.push(rating)
        chrome.runtime.sendMessage({ scope: 'ratingManager', cmd: 'setRatings', data: { ratings: ratings } }, ({ ratings }) => {
          if (ratings) {
            console.log('Ratings updated:', ratings)
            let log = { action: 'newFeedback', mapId: mapID, nodeID: nodeID, value: { userAnnotation: userAnnotation, ratingValue: ratingValue, textValue: node._info.title }, user: 'default', timestamp: Date.now() }
            this.pushLog(log)
            this.updateRatedNode(node, rating)
            // update rated node with the new rating
          }
        })
      }
    })
  }
  editFeedback (node, mapID, rating, ratings) {
    let userAnnotation = rating.userAnnotation
    let ratingValue = rating.ratingValue
    let html = '<div>' + '<span style="text-align: left;">Rating ' + node._info.title.replaceAll('\n', ' ') + '</span>' +
      '<div>' +
      '<span style="text-align: left;">User Annotation</span>' +
      '<textarea id="userAnnotation" class="swal2-input customizeInput" placeholder="Provide your feedback">' + userAnnotation + '</textarea>' +
      '</div>'
    html += '<span style="text-align:left">Rating (1-5):</span><input type="number" min="1" max="5" id="ratingValue" class="swal2-input customizeInput" placeholder="Rate the node" value="' + ratingValue + '"></input></div>'
    Alerts.threeOptionsAlert({
      title: 'Modifying user feedback',
      html: html,
      preConfirm: () => {
        // Retrieve values from inputs
        userAnnotation = document.getElementById('userAnnotation').value
        ratingValue = document.getElementById('ratingValue').value
        if (!ratingValue) {
          // Throw an error or reject a promise to prevent closing the alert
          const swal = require('sweetalert2')
          swal.showValidationMessage('Please provide a rating.') // This will display an error message in the SweetAlert
          return false // Prevents the alert from closing
        } else if (ratingValue < 1 || ratingValue > 5) {
          const swal = require('sweetalert2')
          swal.showValidationMessage('Please provide a rating between 1 and 5.') // This will display an error message in the SweetAlert
          return false // Prevents the alert from closing
        }
      },
      willOpen: () => {
        let element = document.querySelector('.swal2-popup')
        element.style.width = '900px'
      },
      callback: () => {
        // Save model
        if (ratings) {
          const ratingIndex = ratings.findIndex(r => r.nodeID === rating.nodeID && r.mapID === rating.mapID) // Find the index of the model
          if (ratingIndex !== -1) {
            // Update the model's selected status within the array
            ratings[ratingIndex].userAnnotation = userAnnotation
            ratings[ratingIndex].ratingValue = ratingValue
            let rating = ratings[ratingIndex]
            chrome.runtime.sendMessage({
              scope: 'ratingManager',
              cmd: 'setRatings',
              data: { ratings: ratings }
            }, (newRatings) => {
              console.log('Rating updated:', ratings[ratingIndex])
              this.updateRatedNode(node, rating)
              let log = { action: 'editFeedback', mapId: mapID, nodeID: r.nodeID, value: { userAnnotation: userAnnotation, ratingValue: ratingValue, textValue: node._info.title }, user: 'default', timestamp: Date.now() }
              this.pushLog(log)
              /// this.createModelList(models.model)
            })
          }
        }
      },
      denyButtonText: 'Delete',
      denyButtonColor: '#d33',
      denyCallback: () => {
        this.deleteRating(rating, ratings)
      }
    })
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
  parseChatGPTAnswer (json, excerpts = false) {
    let gptItems
    gptItems = Array.from(Object.values(json)[0]).filter(item =>
      Object.keys(item).some(key => key.startsWith('GPT_'))
    )
    let gptItemsNodes = []
    gptItems.forEach((item) => {
      let name = Utils.findValuesEndingWithName(item, 'name')
      if (excerpts) {
        gptItemsNodes.push({label: name, excerpt: '<em>' + item.excerpt + '</em>', description: item.description})
      } else {
        gptItemsNodes.push({ label: name, description: item.description })
      }
    })
    return gptItemsNodes
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
      iconElement.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()
        that.provideQuestions(n)
      })
    })
  }
  provideQuestions (node) {
    chrome.runtime.sendMessage({ scope: 'parameters', cmd: 'getParameters' }, async (data) => {
      Alerts.showLoadingWindow(`Loading...`)
      // GPT Answers
      let that = this
      that.parseMap().then(async () => {
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
        let action
        if (CheckMapUtils.nodeElementHasRectangleShape(node)) {
          action = 'addAnswer'
        } else {
          action = 'selectAnswer'
        }
        // PROMPT FOR RETRIEVING SUGGESTED QUESTIONS
        chrome.runtime.sendMessage({ scope: 'model', cmd: 'getModels' }, async ({ models }) => {
          console.log(models)
          const fromModel = (that, nodeId, model) => {
            const modelSuggestedQuestionsPrompt = PromptBuilder.getPromptForModelSuggestedQuestion(this, answerNodeLabel, answerNodeNote, previousQuestionNodeLabel, that._firsQuestion, model)
            return that.retrieveModelSuggestedQuestions(that, nodeId, modelSuggestedQuestionsPrompt, model.name)
          }
          // Create a promise for the LLM and for each model dynamically
          const promises = [
            ...models.filter(model => model.selected).map(model => fromModel(that, nodeId, model))
          ]
          if (data.parameters.suggestQuestionsByLLM) {
            const fromLLM = (that, nodeId) => {
              const llmSuggestedQuestionsPrompt = PromptBuilder.getPromptForLLMSuggestedQuestions(this, answerNodeLabel, answerNodeNote, previousQuestionNodeLabel, that._firsQuestion)
              return that.retrieveLLMSuggestedQuestion(that, nodeId, llmSuggestedQuestionsPrompt)
            }
            promises.push(fromLLM(that, nodeId))
          }
          // Launch all methods separately and join the answers
          Promise.allSettled(promises).then(results => {
            let newQuestionNodes = []
            results.forEach((result, index) => {
              console.log(`Promise ${index} status:`, result.status)
              if (result.status === 'fulfilled') {
                newQuestionNodes = newQuestionNodes.concat(result.value)
                console.log('Fulfilled with value:', result.value)
              } else {
                console.error('Rejected with reason:', result.reason)
              }
            })
            if (data.parameters.followUpQuestion) {
              // ADD USER QUESTION
              newQuestionNodes.push({
                text: 'Type here a following up question about ' + answerNodeLabel + ' ...',
                style: PromptStyles.UserQuestionItem,
                image: IconsMap['question'],
                parentId: nodeId,
                note: '<b>Question from User</b>'
              })
            }
            MindmeisterClient.doActions(that._mapId, newQuestionNodes).then((response) => {
              if (response.error) {
                Alerts.showErrorToast('There was an error adding the node to the map')
              } else {
                let log = { action: action, mapId: that._mapId, nodeID: nodeId, value: { question: previousQuestionNodeLabel, answer: answerNodeLabel }, user: 'default', timestamp: Date.now() }
                that.pushLog(log)
                Alerts.closeLoadingWindow()
              }
            })
          })
        })
      })
    })
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
        document.querySelector('#numberOfAuthorsParameterInput').value = 4
        styles.push({name: 'Number of items', value: 4})
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
  addPreviousNoteToPrompt (that, prompt, questionNode) {
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
    return prompt
  }
  isRootNode (node) {
    if (node._info.parent) {
      return false
    } else {
      return true
    }
  }
  updateRatedNode (node, rating) {
    console.log(node)
    MindmeisterClient.doActions(this._mapId,
      [],
      [{id: node._info.id, style: PromptStyles[rating.ratingValue]}]
    ).then((response) => {
      if (response.error) {
        Alerts.showErrorToast('There was an error adding the node to the map')
      } else {
        this.addUserAnnotation(this._mapId, rating)
        Alerts.closeLoadingWindow()
      }
    })
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
    let match = /translateX\((\-?\d+)px\)\s*translateY\((\-?\d+)px\)/.exec(transform)
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
  isAnswerNode (node) {
    return MindmapWrapper.hasIcon(node, 'magnifier')
  }
  canBeAggregated (questionNode) {
    const hasChildWithChildren = questionNode.children.some((child) => {
      return child.children && child.children.length > 0
    })
    return hasChildWithChildren
  }
  isQuestionNode (node) {
    return MindmapWrapper.hasIcon(node, 'question')
  }
  pushLog (log) {
    chrome.runtime.sendMessage({ scope: 'logManager', cmd: 'pushLog', data: {log: log} }, async (log) => {
      console.log('new log:', log)
    })
  }
  initManagers (that) {
    const checkDOM = setInterval(function () {
      // Options for the observer (which mutations to observe)
      const config = { attributes: true, childList: true, subtree: true }
      // Callback function to execute when mutations are observed
      const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
          if (mutation.type === 'childList') {
            if (mutation.addedNodes) {
              if (mutation.addedNodes.length > 0) {
                const node = mutation.addedNodes[0]
                if (node.innerText && (node.innerText.includes('Attachments') || node.innerText.includes('Archivos adjuntos'))) {
                  let currentNode = that.getCurrentNode()
                  if (currentNode && that.isQuestionNode(currentNode)) {
                    that.manageAttachmentsMenu(that, node, currentNode)
                  }
                } else if (node.innerHTML && node.innerHTML.includes(Locators.PDF_ELEMENT) && node.innerHTML.includes('.pdf')) {
                  let divs = document.querySelectorAll('div.kr-view')
                  let targetDiv = Array.from(divs).find(div => div.getAttribute('style').includes('padding-top: 10px; padding-bottom: 10px; width: 320px; background-color: rgb(255, 255, 255);'))
                  let currentNode = that.getCurrentNode()
                  if (currentNode && that.isQuestionNode(currentNode)) {
                    that.manageAttachmentsMenu(that, targetDiv, currentNode)
                  }
                } else if (node.innerText && (node.innerText.includes('Drag & drop files') || node.innerText.includes('Arrastra y suelta archivos o pega enlaces en los temas.'))) {
                  // Extend the context menu of nodes
                  that.manageContextMenu(that)
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
}

module.exports = MindmapManager
