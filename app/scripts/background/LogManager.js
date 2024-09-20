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
          ChromeStorage.getData(searchKey, ChromeStorage.local, (err, logs) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (logs) {
                try {
                  logs = JSON.parse(logs)
                } catch (e) {
                  logs = []
                }
              } else {
                logs = []
              }
              logs.push(request.data.log)
              let stringifiedDatabase = JSON.stringify(logs)
              ChromeStorage.setData(searchKey, stringifiedDatabase, ChromeStorage.local, (err) => {
                if (err) {
                  sendResponse({ err: err })
                } else {
                  sendResponse({ logs: logs || [] })
                }
              })
            }
          })
        } else if (request.cmd === 'getLogs') {
          let searchKey = 'db.logs'
          ChromeStorage.getData(searchKey, ChromeStorage.local, (err, logs) => {
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
        } else if (request.cmd === 'getLogsForQuestions') {
          let searchKey = 'db.logs'
          ChromeStorage.getData(searchKey, ChromeStorage.local, (err, logs) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              let finalResults = []
              if (logs) {
                try {
                  logs = JSON.parse(logs)
                  // Filter logs to find initial matches and store their nodeIDs
                  // Define the primary actions to filter initially
                  const primaryActions = ['firstQuestion', 'selectQuestion', 'firstQuestionWithPDF', 'selectQuestionWithPDF']
                  let filteredLogs = logs.filter(log => primaryActions.includes(log.action))
                  let nodeIDs = new Set(filteredLogs.map(log => log.nodeID))
                  // Additional filter for feedback logs if their nodeID is in the previously filtered nodeIDs
                  let feedbackActions = ['editFeedback', 'newFeedback']
                  let feedbackLogs = logs.filter(log => feedbackActions.includes(log.action) && nodeIDs.has(log.nodeID))
                  // Combine the initial filtered logs with the relevant feedback logs
                  finalResults = filteredLogs.concat(feedbackLogs)
                  // Output the final filtered logs
                  console.log(finalResults)
                } catch (e) {
                  logs = []
                }
                sendResponse({ logs: finalResults || [] })
              } else {
                sendResponse({ logs: [] })
              }
            }
          })
        } else if (request.cmd === 'getLogsFromMap') {
          let searchKey = 'db.logs'
          let mapID = request.data.mapID
          ChromeStorage.getData(searchKey, ChromeStorage.local, (err, logs) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (logs) {
                try {
                  logs = JSON.parse(logs)
                  // Filter logs to find initial matches and store their nodeIDs
                  // Define the primary actions to filter initially
                  let filteredLogs = logs.filter(log => log.mapId === mapID)
                  // Output the final filtered logs
                  console.log(filteredLogs)
                  sendResponse({ logs: filteredLogs || [] })
                } catch (e) {
                  sendResponse({ logs: [] })
                }
              } else {
                sendResponse({ logs: [] })
              }
            }
          })
        } else if (request.cmd === 'setLogs') {
          let searchKey = 'db.logs'
          let logs = request.data.logs
          let stringifiedDatabase = JSON.stringify(logs)
          ChromeStorage.setData(searchKey, stringifiedDatabase, ChromeStorage.local, (err) => {
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
