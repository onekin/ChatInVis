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
          ChromeStorage.getData(searchKey, ChromeStorage.sync, (err, parameters) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (parameters && parameters.data) {
                let parsedParameters = JSON.parse(parameters.data)
                sendResponse({parameters: parsedParameters || { followUpQuestion: true, userProvidedAnswer: true, suggestQuestionsByLLM: true, showSource: true }})
              } else {
                sendResponse({parameters: { followUpQuestion: true, userProvidedAnswer: true, suggestQuestionsByLLM: true, showSource: true }})
              }
            }
          })
        } else if (request.cmd === 'getParameter') {
          let type = request.data.type
          let searchKey = 'parameters' + type
          ChromeStorage.getData(searchKey, ChromeStorage.sync, (err, parameters) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (parameters && parameters.data) {
                let parsedParameter = JSON.parse(parameters.data).type
                sendResponse({ parameter: parsedParameter || '' })
              } else {
                sendResponse({ parameter: true })
              }
            }
          })
        } else if (request.cmd === 'setParameters') {
          let parameters = request.data.parameters
          let searchKey = 'parameters'
          ChromeStorage.setData(searchKey, { data: JSON.stringify(parameters) }, ChromeStorage.sync, (err) => {
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
          ChromeStorage.getData('parameters.numberOfAuthors', ChromeStorage.sync, (err, parameter) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (parameter && parameter.data) {
                parameter = JSON.parse(parameter.data)
                sendResponse({ parameter: parameter || 3 })
              } else {
                sendResponse({ parameter: 3 })
              }
            }
          })
        } else if (request.cmd === 'setNumberOfAuthorsParameter') {
          let numberOfAuthorsParameter = request.data.numberOfAuthorsParameter
          ChromeStorage.setData('parameters.numberOfAuthors', { data: JSON.stringify(numberOfAuthorsParameter) }, ChromeStorage.sync, (err) => {
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
