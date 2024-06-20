const ChromeStorage = require('../utils/ChromeStorage')

class ModelManager {
  init () {
    // Initialize replier for requests related to storage
    this.initRespondent()
  }

  initRespondent () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'model') {
        if (request.cmd === 'getModels') {
          let searchKey = 'models'
          ChromeStorage.getData(searchKey, ChromeStorage.local, (err, models) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (models) {
                let parsedModels = JSON.parse(models)
                sendResponse({ models: parsedModels || [] })
              } else {
                sendResponse({ models: [] })
              }
            }
          })
        } else if (request.cmd === 'setModels') {
          let searchKey = 'models'
          let models = request.data.models
          ChromeStorage.setData(searchKey, JSON.stringify(models), ChromeStorage.local, (err) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ models: models })
            }
          })
        }
        return true
      }
    })
  }
}

module.exports = ModelManager // Use module.exports for CommonJS
