const ChromeStorage = require('../utils/ChromeStorage')

class RatingManager {
  init () {
    // Initialize replier for requests related to storage
    this.initRespondent()
  }

  initRespondent () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'ratingManager') {
        if (request.cmd === 'setRating') {
          let searchKey = 'ratings'
          ChromeStorage.getData(searchKey, ChromeStorage.local, (err, ratings) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (ratings && ratings.data) {
                let parsedRatings = JSON.parse(ratings.data)
                parsedRatings.push(request.data.rating)
                ChromeStorage.setData(searchKey, JSON.stringify(ratings), ChromeStorage.local, (err) => {
                  if (err) {
                    sendResponse({ err: err })
                  } else {
                    sendResponse({ ratings: parsedRatings || [] })
                  }
                })
              } else {
                sendResponse({ ratings: [] })
              }
            }
          })
        } else if (request.cmd === 'getRatings') {
          let searchKey = 'ratings'
          ChromeStorage.getData(searchKey, ChromeStorage.local, (err, ratings) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (ratings) {
                let parsedRatings = JSON.parse(ratings)
                sendResponse({ ratings: parsedRatings || [] })
              } else {
                sendResponse({ ratings: [] })
              }
            }
          })
        } else if (request.cmd === 'setRatings') {
          let searchKey = 'ratings'
          let ratings = request.data.ratings
          ChromeStorage.setData(searchKey, JSON.stringify(ratings), ChromeStorage.local, (err) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ ratings: ratings })
            }
          })
        }
        return true
      }
    })
  }
}

module.exports = RatingManager // Use module.exports for CommonJS
