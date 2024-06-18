const ChromeStorage = require('../utils/ChromeStorage')

class LogManager {
  init () {
    // Initialize replier for requests related to storage
    this.initRespondent()
  }

  initRespondent () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'logManager') {
        if (request.cmd === 'pushLog') {
          let searchKey = 'db.logs'
          ChromeStorage.getData(searchKey, ChromeStorage.sync, (err, logs) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (logs) {
                try {
                  logs = JSON.parse(logs)
                } catch (e) {
                  logs = []
                }
                logs.push(request.data.log)
                ChromeStorage.setData(searchKey, { data: JSON.stringify(logs) }, ChromeStorage.sync, (err) => {
                  if (err) {
                    sendResponse({ err: err })
                  } else {
                    sendResponse({ logs: logs || [] })
                  }
                })
              } else {
                sendResponse({ logs: [] })
              }
            }
          })
        } else if (request.cmd === 'getLogs') {
          let searchKey = 'db.logs'
          ChromeStorage.getData(searchKey, ChromeStorage.sync, (err, logs) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (logs) {
                try {
                  logs = JSON.parse(logs)
                } catch (e) {
                  logs = []
                }
                sendResponse({ logs: logs || [] })
              } else {
                sendResponse({ logs: [] })
              }
            }
          })
        } else if (request.cmd === 'setLogs') {
          let searchKey = 'db.logs'
          let logs = request.data.logs
          ChromeStorage.setData(searchKey, { data: JSON.stringify(logs) }, ChromeStorage.sync, (err) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ logs: logs })
            }
          })
        }
        return true
      }
    })
  }
}

module.exports = LogManager // Use module.exports for CommonJS
