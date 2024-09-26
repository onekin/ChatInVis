
const IconsMap = {
  'tick-enabled': {
    fileUrl: chrome.runtime.getURL('images/tickEnabled.png'),
    mindmeisterName: ':white_check_mark:'
  },
  'tick-disabled': {
    fileUrl: chrome.runtime.getURL('images/tickDisabled.png'),
    mindmeisterName: ':ballot_box_with_check:'
  },
  'magnifier': {
    fileUrl: chrome.runtime.getURL('images/magnifier.png'),
    mindmeisterName: ':mag:'
  },
  'question': {
    fileUrl: chrome.runtime.getURL('images/question.png'),
    mindmeisterName: ':question:'
  },
  'abcd': {
    fileUrl: chrome.runtime.getURL('images/question.png'),
    mindmeisterName: ':abcd:'
  },
  'interrobang': {
    fileUrl: chrome.runtime.getURL('images/question.png'),
    mindmeisterName: ':interrobang:'
  }
}

module.exports = IconsMap
