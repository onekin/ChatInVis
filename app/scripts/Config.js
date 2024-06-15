const Config = {
  defaultLLM: 'openAI',
  models: [
    { name: '5W1H',
      description: 'This model guides the formulation of questions based on the "Five Ws and One H" approach: Who, What, Where, When, Why, and How. It is designed to extract comprehensive information about a subject, ensuring a thorough understanding by addressing all critical aspects of an inquiry.',
      numberOfQuestions: 6,
      selected: true,
      id: -1
    }
  ]
}

module.exports = Config
