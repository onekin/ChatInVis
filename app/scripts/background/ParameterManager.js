const ChromeStorage = require('../utils/ChromeStorage')

class ParameterManager {
  init () {
    // Initialize replier for requests related to storage
    this.initRespondent()
  }

  initRespondent () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'parameters') {
        if (request.cmd === 'getParameters') {
          let searchKey = 'parameters'
          ChromeStorage.getData(searchKey, ChromeStorage.local, (err, parameters) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (parameters) {
                let parsedParameters = JSON.parse(parameters)
                sendResponse({parameters: parsedParameters || { followUpQuestion: true, userProvidedAnswer: true, suggestQuestionsByLLM: true, suggestItemsByLogs: true, showSource: true, allowSystemLogging: true, systemSuggestedItems: 3, llmSuggestedItems: 3 }})
              } else {
                sendResponse({parameters: { followUpQuestion: true, userProvidedAnswer: true, suggestQuestionsByLLM: true, suggestItemsByLogs: true, showSource: true, allowSystemLogging: true, systemSuggestedItems: 3, llmSuggestedItems: 3 }})
              }
            }
          })
        } else if (request.cmd === 'getParameter') {
          let type = request.data.type
          let searchKey = 'parameters' + type
          ChromeStorage.getData(searchKey, ChromeStorage.local, (err, parameters) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (parameters) {
                let parsedParameter = JSON.parse(parameters).type
                sendResponse({ parameter: parsedParameter || '' })
              } else {
                sendResponse({ parameter: true })
              }
            }
          })
        } else if (request.cmd === 'setParameters') {
          let parameters = request.data.parameters
          let searchKey = 'parameters'
          ChromeStorage.setData(searchKey, JSON.stringify(parameters), ChromeStorage.local, (err) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ parameters: parameters })
            }
          })
        }
        return true
      }
    })

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'parameterManager') {
        if (request.cmd === 'getNumberOfAuthorsParameter') {
          ChromeStorage.getData('parameters.numberOfAuthors', ChromeStorage.local, (err, parameter) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (parameter) {
                parameter = JSON.parse(parameter)
                sendResponse({ parameter: parameter || 3 })
              } else {
                sendResponse({ parameter: 3 })
              }
            }
          })
        } else if (request.cmd === 'setNumberOfAuthorsParameter') {
          let numberOfAuthorsParameter = request.data.numberOfAuthorsParameter
          ChromeStorage.setData('parameters.numberOfAuthors', JSON.stringify(numberOfAuthorsParameter), ChromeStorage.local, (err) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ parameter: numberOfAuthorsParameter })
            }
          })
        }
        return true
      }
    })
  }
}

module.exports = ParameterManager // Use module.exports for CommonJS
