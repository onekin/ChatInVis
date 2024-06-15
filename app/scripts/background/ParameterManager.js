const ChromeStorage = require('../utils/ChromeStorage')

class ParameterManager {
  init () {
    // Initialize replier for requests related to storage
    this.initRespondent()
  }

  initRespondent () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'parameter') {
        if (request.cmd === 'getParameter') {
          let type = request.data.type
          let searchKey = 'parameter.' + type
          ChromeStorage.getData(searchKey, ChromeStorage.sync, (err, parameter) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (parameter && parameter.data) {
                let parsedParameter = JSON.parse(parameter.data)
                sendResponse({ parameter: parsedParameter || '' })
              } else {
                sendResponse({ parameter: '' })
              }
            }
          })
        } else if (request.cmd === 'setParameter') {
          let parameter = request.data.parameter
          let type = request.data.type
          let searchKey = 'parameter.' + type
          ChromeStorage.setData(searchKey, { data: JSON.stringify(parameter) }, ChromeStorage.sync, (err) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ parameter: parameter })
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
