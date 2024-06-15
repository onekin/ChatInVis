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
          ChromeStorage.getData(searchKey, ChromeStorage.sync, (err, models) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (models && models.data) {
                let parsedModels = JSON.parse(models.data)
                sendResponse({ models: parsedModels || [] })
              } else {
                sendResponse({ models: [] })
              }
            }
          })
        } else if (request.cmd === 'setModels') {
          let searchKey = 'models'
          let models = request.data.models
          ChromeStorage.setData(searchKey, { data: JSON.stringify(models) }, ChromeStorage.sync, (err) => {
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
