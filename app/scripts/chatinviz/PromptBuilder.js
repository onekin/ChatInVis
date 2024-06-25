const ModelDefaultValues = require('./ModelDefaultValues')

class PromptBuilder {
  // PROMPT FOR LLM BASED QUESTION
  static getPromptForLLMAnswers (that, question) {
    let numberOfItems = this.getNumberOfLLMItems(that)
    let description = this.getDescription(that)
    let prompt = question + 'Please provide ' + numberOfItems + ' items with descriptions that ' + description
    prompt += ' You have to provide the response in JSON format including each item in an array. The format should be as follows:'
    prompt += '{\n' + '"items": ['
    for (let i = 0; i < numberOfItems; i++) {
      if (i === 0) {
        prompt += '{"GPT_item_name":"label for the answer",' +
          '"description": "description of the item reason that ' + description + '",' +
          '}'
      } else {
        prompt += ',{"GPT_item_name":"label for the answer",' +
          '"description": "description of the item reason that ' + description + '",' +
          '}'
      }
    }
    prompt += '\n]\n' + '}'
    return prompt
  }
  // PROMPT FOR PDF BASED QUESTION
  static getPromptForPDFAnswers (that, question) {
    let numberOfItems = this.getNumberOfLLMItems(that)
    let description = this.getDescription(that)
    let prompt = 'Based on the provided pdf, ' + question + 'Please provide ' + numberOfItems + ' items with descriptions that ' + description
    prompt += ' You have to provide the response in JSON format including each item in an array. The JSON should list a text excerpt of the provided PDF that supports each answer and has made you to reach the answer. The format should be as follows:'
    prompt += '{\n' + '"items": ['
    for (let i = 0; i < numberOfItems; i++) {
      if (i === 0) {
        prompt += '{"GPT_item_name":"name for item in a problematic style",\n' +
          '"excerpt": "[Excerpt from the provided text that justifies the answer]",\n' +
          '"description": "description of the answer reason",\n' +
          '}'
      } else {
        prompt += '{"GPT_item_name":"name for item in a problematic style",\n' +
          '"excerpt": "[Excerpt from the provided text that justifies the answer]",\n' +
          '"description": "description of the answer reason",\n' +
          '}'
      }
    }
    prompt += '\n]\n' + '}'
    return prompt
  }
  // PROMPTS FOR AGGREGATION QUESTION
  static getPromptForSummarizationAnswers (question, nodes, number) {
    // let that = this
    let prompt = 'QUESTION=[ ' + question + ']\n'
    for (let i = 0; i < nodes.length; i++) {
      let description
      if (nodes[i]._info.note) {
        description = nodes[i]._info.note.trim().replaceAll('\n', ' ')
      } else {
        description = ' '
      }
      if (i === 0) {
        prompt += 'ANSWERS= {\n' +
          'node_name":' + nodes[i]._info.title.replaceAll('\n', ' ') + ',\n' +
          '"description": ' + description + ',\n' +
          '}'
      } else {
        prompt += ',{\n' +
          '"node_name":' + nodes[i]._info.title.replaceAll('\n', ' ') + ',\n' +
          '"description": ' + description + ',\n' +
          '}\n'
      }
    }
    prompt += 'Summarization. I want you to behave as an academic. I have provided a QUESTION above and then a set of answers with descriptions in a JSON. Answers might not be fully alternative but some nuisance might exists among them. I want you to cluster the set of answers in ' + number + ' clusters that encloses those answers that are semantically closer.' + '\n'
    prompt += ' You have to provide the response in JSON format including each clustered item in an array. The format should be as follows:\n'
    prompt += '{\n' + '"clusters": [\n'
    for (let i = 0; i < number; i++) {
      if (i === 0) {
        prompt += '{\n' +
          '"cluster_name":"cluster name in a problematic style",\n' +
          '"description": "description of the cluster",\n' +
          '"clusteredItems": [a list of items with two keys as in the above answers, node_name and description of the node_name as it is in the above example]\n' +
          '}\n'
      } else {
        prompt += ',{\n' +
          '"cluster_name":"cluster name in a problematic style",\n' +
          '"description": "description of the cluster",\n' +
          '"clusteredItems": [a list of items with two keys as in the above answers, node_name and description of the node_name as it is in the above example]\n' +
          '}\n'
      }
    }
    prompt += ',\n]\n' + '}\n'
    return prompt
  }
  // PROMPTS FOR AGGREGATION QUESTION
  static getPromptForSummarizationQuestions (question, nodes, number) {
    // let that = this
    let prompt = 'ANSWER=[ ' + question + ']\n'
    for (let i = 0; i < nodes.length; i++) {
      let description
      if (nodes[i]._info.note) {
        description = nodes[i]._info.note.trim().replaceAll('\n', ' ')
      } else {
        description = ' '
      }
      if (i === 0) {
        prompt += 'QUESTIONS= {\n' +
          'question_name":' + nodes[i]._info.title.replaceAll('\n', ' ') + ',\n' +
          '"description": ' + description + ',\n' +
          '}'
      } else {
        prompt += ',{\n' +
          '"question_name":' + nodes[i]._info.title.replaceAll('\n', ' ') + ',\n' +
          '"description": ' + description + ',\n' +
          '}\n'
      }
    }
    prompt += 'Summarization. I want you to behave as an academic. I have provided a previous answer above and then a set of following up questions with descriptions in a JSON. Questions might not be fully alternative but some nuisance might exists among them. I want you to cluster the set of questions in ' + number + ' clusters that encloses those questions that are semantically closer.' + '\n'
    prompt += ' You have to provide the response in JSON format including each clustered item in an array. The format should be as follows:\n'
    prompt += '{\n' + '"clusters": [\n'
    for (let i = 0; i < number; i++) {
      if (i === 0) {
        prompt += '{\n' +
          '"cluster_name":"the summarized new question, it has to be a new question that clusters related ones",\n' +
          '"description": "description of the question that cluster more questions",\n' +
          '"clusteredItems": [a list of items with two keys as in the above questions, question_name and description of the question_name as it is in the above example]\n' +
          '}\n'
      } else {
        prompt += ',{\n' +
          '"cluster_name":"the summarized new question, it has to be a new question that clusters related ones",\n' +
          '"description": "description of the question that cluster more questions",\n' +
          '"clusteredItems": [a list of items with two keys as in the above questions, question_name and description of the question_name as it is in the above example]\n' +
          '}\n'
      }
    }
    prompt += ',\n]\n' + '}\n'
    return prompt
  }
  static getPromptForModelSuggestedQuestion (that, answerNodeLabel, answerNodeNote, previousQuestionNodeLabel, firsQuestion, model) {
    let numberOfItems = model.numberOfQuestions
    let description = this.getDescription(that)
    let prompt = 'Exploring this first question: ' + firsQuestion + ', I have later ask: ' + previousQuestionNodeLabel + '. The answer for this question was ' + answerNodeLabel + ' which means ' + answerNodeNote + '.\n'
    prompt += ' You have to suggest me more ' + numberOfItems + ' following up QUESTIONS based on the ' + model.name + ' model in JSON format including each item in an array. The ' + model.name + ' is based on ' + model.description + '. Please suggest the questions in the following format:\n'
    prompt += '{\n' + '"items": ['
    for (let i = 0; i < numberOfItems; i++) {
      if (i === 0) {
        prompt += '{"GPT_item_name":"new suggested question",' +
          '"description": "description of the item reason that ' + description + '",' +
          '}'
      } else {
        prompt += ',{"GPT_item_name":"new suggested question",' +
          '"description": "description of the question reason that ' + description + '",' +
          '}'
      }
    }
    prompt += '\n]\n' + '}'
    return prompt
  }
  static getPromptForLogsSuggestedQuestions (that, answerNodeLabel, answerNodeNote, previousQuestionNodeLabel, firsQuestion, logs) {
    let numberOfItems = this.getNumberOfLogItems(that)
    let prompt = 'Exploring this first question: ' + firsQuestion + ', I have later ask: ' + previousQuestionNodeLabel + '. The answer for this question was ' + answerNodeLabel + ' which means ' + answerNodeNote + '.\n'
    prompt += ' You have to suggest me more ' + numberOfItems + ' following up QUESTIONS in JSON format including each item in an array. You have to provide me the questions from the following log of previous questions, to do that, from the "answer" field of the log, find the more similars to "' + answerNodeLabel + '" and then include the "question" field in your answer. The format should be as follows:'
    prompt += '{\n' + '"items": ['
    for (let i = 0; i < numberOfItems; i++) {
      if (i === 0) {
        prompt += '{"GPT_item_name":"question from the log as it is in the log element",' +
          '"description": "mention for what answer was used the question",' +
          '}'
      } else {
        prompt += ',{"GPT_item_name":"question from the log as it is in the log element",' +
          '"description": "mention for what answer was used the question",' +
          '}'
      }
    }
    prompt += '\n]\n' + '}'
    logs = logs.map(log => log.value)
    prompt += '\n\nLOGS: ' + JSON.stringify(logs)
    return prompt
  }
  static getPromptForLLMSuggestedQuestions (that, answerNodeLabel, answerNodeNote, previousQuestionNodeLabel, firsQuestion) {
    let numberOfItems = this.getNumberOfLLMItems(that)
    let description = this.getDescription(that)
    let prompt = 'Exploring this first question: ' + firsQuestion + ', I have later ask: ' + previousQuestionNodeLabel + '. The answer for this question was ' + answerNodeLabel + ' which means ' + answerNodeNote + '.\n'
    prompt += ' You have to suggest me more ' + numberOfItems + ' following up QUESTIONS in JSON format including each item in an array. The format should be as follows:'
    prompt += '{\n' + '"items": ['
    for (let i = 0; i < numberOfItems; i++) {
      if (i === 0) {
        prompt += '{"GPT_item_name":"new suggested question",' +
          '"description": "description of the item reason that ' + description + '",' +
          '}'
      } else {
        prompt += ',{"GPT_item_name":"new suggested question",' +
          '"description": "description of the question reason that ' + description + '",' +
          '}'
      }
    }
    prompt += '\n]\n' + '}'
    return prompt
  }
  static getNumberOfLLMItems (that) {
    return that._styles.llmSuggestedItems || ModelDefaultValues.NumberOfItems.default
  }
  static getNumberOfLogItems (that) {
    return that._styles.systemSuggestedItems || ModelDefaultValues.NumberOfItems.default
  }
  static getDescription (that) {
    return ModelDefaultValues.Description.default
  }
}

module.exports = PromptBuilder
