const Config = {
  defaultLLM: 'openAI',
  models: [
    { name: '5W1H',
      description: 'This model guides the formulation of questions based on the "Five Ws and One H" approach: Who, What, Where, When, Why, and How. It is designed to extract comprehensive information about a subject, ensuring a thorough understanding by addressing all critical aspects of an inquiry.',
      numberOfQuestions: 6
    },
    {
      name: 'Cause & Consequence',
      description: 'This model focuses on identifying the causes and consequences of specific events or actions. It helps in understanding the underlying reasons behind occurrences and the effects that follow, promoting a deeper analysis of events and decision-making processes.',
      numberOfQuestions: 2
    }
  ]
}

module.exports = Config
