const { loadQAStuffChain } = require('langchain/chains')
const { ChatOpenAI } = require('langchain/chat_models/openai')
const { ChatAnthropic } = require('langchain/chat_models/anthropic')
const { TokenTextSplitter } = require('langchain/text_splitter')
const { OpenAIEmbeddings } = require('langchain/embeddings/openai')
const { MemoryVectorStore } = require('langchain/vectorstores/memory')
const { PromptTemplate } = require('@langchain/core/prompts')
const ChromeStorage = require('../utils/ChromeStorage')

class LLMManagerBackground {
  init () {
    // Initialize replier for requests related to storage
    this.initRespondent()
  }

  initRespondent () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'llm') {
        if (request.cmd === 'getSelectedLLM') {
          ChromeStorage.getData('llm.selected', ChromeStorage.local, (err, llm) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (llm) {
                let parsedLLM = JSON.parse(llm)
                sendResponse({ llm: parsedLLM || '' })
              } else {
                sendResponse({ llm: '' })
              }
            }
          })
        } else if (request.cmd === 'setSelectedLLM') {
          let selectedLLM = request.data.llm
          selectedLLM = JSON.stringify(selectedLLM)
          ChromeStorage.setData('llm.selected', selectedLLM, ChromeStorage.local, (err) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ llm: selectedLLM })
            }
          })
        } else if (request.cmd === 'getAPIKEY') {
          let llmKey = 'llm.' + request.data + 'key'
          ChromeStorage.getData(llmKey, ChromeStorage.local, (err, apiKey) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (apiKey) {
                let parsedKey = JSON.parse(apiKey)
                sendResponse({ apiKey: parsedKey || '' })
              } else {
                sendResponse({ apiKey: '' })
              }
            }
          })
        } else if (request.cmd === 'setAPIKEY') {
          let llm = 'llm.' + request.data.llm + 'key'
          let apiKey = request.data.apiKey
          apiKey = JSON.stringify(apiKey)
          ChromeStorage.setData(llm, apiKey, ChromeStorage.local, (err) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ apiKey: apiKey })
            }
          })
        }
        return true
      }
    })

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'askLLM') {
        if (request.cmd === 'anthropic') {
          if (request.data.documents) {
            this.askLLMAnthropicAIWithDocuments(request).then(
              res => sendResponse({ res: res }),
              err => sendResponse({ err: err })
            )// Return the error inside the message handler
          } else {
            this.askLLMAnthropic(request).then(
              res => sendResponse({ res: res }),
              err => sendResponse({ err: err })
            )// Return the error inside the message handler
          }
          return true // Return true inside the message handler
        } else if (request.cmd === 'openAI') {
          if (request.data.documents) {
            this.askLLMOpenAIWithDocuments(request).then(
              res => sendResponse({ res: res }),
              err => sendResponse({ err: err })
            )// Return the error inside the message handler
          } else {
            this.askLLMOpenAI(request).then(
              res => sendResponse({ res: res }),
              err => sendResponse({ err: err })
            )// Return the error inside the message handler
          }
          return true // Return true inside the message handler
        } else if (request.cmd === 'openAIBasic') {
          if (request.data.documents) {
            this.askLLMOpenAIWithDocumentsBasicPlan(request).then(
              res => sendResponse({ res: res }),
              err => sendResponse({ err: err })
            )// Return the error inside the message handler
          } else {
            this.askLLMOpenAIBasicPlan(request).then(
              res => sendResponse({ res: res }),
              err => sendResponse({ err: err })
            )// Return the error inside the message handler
          }
          return true // Return true inside the message handler
        }
      }
    })
  }

  async askLLMOpenAIWithDocuments (request) {
    const apiKey = request.data.apiKey
    const query = request.data.query
    const documents = request.data.documents
    let callback = async function (documents) {
      // Create QA chain
      console.log('QUERY: ' + query)
      console.log('TRYING REMOVING LAST PAGE')
      return chain.call({ // Make sure to return the promise here
        input_documents: documents,
        question: query
      }).then(res => {
        // if stored max pages nothing, else store max pages
        return res // Return the result so it can be used in the next .then()
      }).catch(async err => { // Handle the error properly
        if (err.toString().startsWith('Error: 429')) {
          documents.pop()
          if (documents.length === 0) {
            return { error: 'All documents removed, no results found.' }
          }
          return resolveWithEmbeddings(documents) // Return the callback promise
        } else {
          return { error: 'An error has occurred during callback' }
        }
      })
    }

    let resolveWithEmbeddings = async function (documents) {
      let results
      try {
        const splitter = new TokenTextSplitter({
          chunkSize: 500,
          chunkOverlap: 20
        })
        const output = await splitter.splitDocuments(documents)
        // Create LLM
        const docsearch = await MemoryVectorStore.fromDocuments(
          output, new OpenAIEmbeddings({ openAIApiKey: apiKey })
        )
        results = await docsearch.similaritySearch(query, 22)
      } catch (err) {
        return { error: 'An error has occurred loading embeddings' }
      }
      const chainA = loadQAStuffChain(model)
      // Create QA chain
      console.log('QUERY: ' + query)
      console.log('TRYING WITH EMBEDDINGS')
      return chainA.call({
        input_documents: results,
        question: query
      }).then(res => {
        // if stored max pages nothing, else store max pages
        return res // Return the result so it can be used in the next .then()
      }).catch(async err => {
        console.log(err.toString())
        // Handle the error properly
        return { error: 'An error has occurred with embeddings' }
      })
    }
    // create model
    let totalCompletionTokens = 0
    let totalPromptTokens = 0
    let totalExecutionTokens = 0

    const model = new ChatOpenAI({
      temperature: 0,
      callbacks: [
        {
          handleLLMEnd: (output, runId, parentRunId, tags) => {
            const { completionTokens, promptTokens, totalTokens } = output.llmOutput?.tokenUsage || { completionTokens: 0, promptTokens: 0, totalTokens: 0 }

            totalCompletionTokens += completionTokens
            totalPromptTokens += promptTokens
            totalExecutionTokens += totalTokens

            console.log(`Total completion tokens: ${totalCompletionTokens}`)
            console.log(`Total prompt tokens: ${totalPromptTokens}`)
            console.log(`Total execution tokens: ${totalExecutionTokens}`)
          }
        }
      ],
      modelName: 'gpt-4-1106-preview',
      openAIApiKey: apiKey,
      modelKwargs: {
        'response_format': {
          type: 'json_object'
        }
      }
    })

    // Create QA chain
    const chain = loadQAStuffChain(model)
    console.log('QUERY: ' + query)
    return chain.call({ // Return the promise here as well
      input_documents: documents,
      question: query
    }).then(res => {
      return res // Return the result so it can be used in the next .then()
    }).catch(async err => {
      console.log(err.toString())
      if (err.toString().startsWith('Error: 429')) {
        documents.pop()
        if (documents.length === 0) {
          return { error: 'All documents removed, no results found.' }
        }
        return callback(documents)
      } else if (err.toString().startsWith('Error: 401')) {
        return { error: 'Incorrect API key provided.' }
      } else {
        return { error: 'An error has occurred trying first call.' }
      }
    })
  }

  async askLLMOpenAI (request) {
    const apiKey = request.data.apiKey
    const query = request.data.query
    // create model
    let totalCompletionTokens = 0
    let totalPromptTokens = 0
    let totalExecutionTokens = 0

    const model = new ChatOpenAI({
      temperature: 0,
      callbacks: [
        {
          handleLLMEnd: (output, runId, parentRunId, tags) => {
            const { completionTokens, promptTokens, totalTokens } = output.llmOutput?.tokenUsage || { completionTokens: 0, promptTokens: 0, totalTokens: 0 }

            totalCompletionTokens += completionTokens
            totalPromptTokens += promptTokens
            totalExecutionTokens += totalTokens

            console.log(`Total completion tokens: ${totalCompletionTokens}`)
            console.log(`Total prompt tokens: ${totalPromptTokens}`)
            console.log(`Total execution tokens: ${totalExecutionTokens}`)
          }
        }
      ],
      modelName: 'gpt-4-1106-preview',
      openAIApiKey: apiKey,
      modelKwargs: {
        'response_format': {
          type: 'json_object'
        }
      }
    })

    const promptTemplate = PromptTemplate.fromTemplate(
      '{query}'
    )
    // Create QA chain
    const chain = promptTemplate.pipe(model)
    return chain.invoke({ query: query }).then(res => {
      return res.text // Return the result so it can be used in the next .then()
    }).catch(async err => {
      console.log(err.toString())
      if (err.toString().startsWith('Error: 429')) {
        return { error: 'Incorrect API key provided.' + err.toString() }
      } else if (err.toString().startsWith('Error: 401')) {
        return { error: 'Incorrect API key provided.' }
      } else {
        return { error: 'An error has occurred trying first call.' }
      }
    })
  }

  async askLLMAnthropic (request) {
    const apiKey = request.data.apiKey
    const query = request.data.query
    // create model
    let totalCompletionTokens = 0
    let totalPromptTokens = 0
    let totalExecutionTokens = 0
    const model = new ChatAnthropic({
      temperature: 0.2,
      anthropicApiKey: apiKey,
      modelName: 'claude-2.0',
      callbacks: [
        {
          handleLLMEnd: (output, runId, parentRunId, tags) => {
            const { completionTokens, promptTokens, totalTokens } = output.llmOutput?.tokenUsage || { completionTokens: 0, promptTokens: 0, totalTokens: 0 }

            totalCompletionTokens += completionTokens
            totalPromptTokens += promptTokens
            totalExecutionTokens += totalTokens

            console.log(`Total completion tokens: ${totalCompletionTokens}`)
            console.log(`Total prompt tokens: ${totalPromptTokens}`)
            console.log(`Total execution tokens: ${totalExecutionTokens}`)
          }
        }
      ]
    })

    const promptTemplate = PromptTemplate.fromTemplate(
      '{query}'
    )
    // Create QA chain
    const chain = promptTemplate.pipe(model)
    return chain.invoke({ query: query }).then(res => {
      return res.text // Return the result so it can be used in the next .then()
    }).catch(async err => {
      console.log(err.toString())
      if (err.toString().startsWith('Error: 401')) {
        return { error: 'Incorrect API key provided.' }
      } else {
        return { error: err.toString() }
      }
    })
  }

  async askLLMAnthropicWithDocument (request) {
    const apiKey = request.data.apiKey
    const query = request.data.query
    const documents = request.data.documents
    // Create LLM
    let totalCompletionTokens = 0
    let totalPromptTokens = 0
    let totalExecutionTokens = 0
    const model = new ChatAnthropic({
      temperature: 0.2,
      anthropicApiKey: apiKey,
      modelName: 'claude-2.0',
      callbacks: [
        {
          handleLLMEnd: (output, runId, parentRunId, tags) => {
            const { completionTokens, promptTokens, totalTokens } = output.llmOutput?.tokenUsage || { completionTokens: 0, promptTokens: 0, totalTokens: 0 }

            totalCompletionTokens += completionTokens
            totalPromptTokens += promptTokens
            totalExecutionTokens += totalTokens

            console.log(`Total completion tokens: ${totalCompletionTokens}`)
            console.log(`Total prompt tokens: ${totalPromptTokens}`)
            console.log(`Total execution tokens: ${totalExecutionTokens}`)
          }
        }
      ]
    })
    // Create QA chain
    const chain = loadQAStuffChain(model)
    console.log('QUERY: ' + query)
    return chain.call({ // Return the promise here as well
      input_documents: documents,
      question: query
    }).then(res => {
      return res // Return the result so it can be used in the next .then()
    }).catch(async err => {
      console.log(err.toString())
      if (err.toString().startsWith('Error: 401')) {
        return { error: 'Incorrect API key provided.' }
      } else {
        return { error: err.toString() }
      }
    })
  }

  async askLLMOpenAIWithDocumentsBasicPlan (request) {
    const apiKey = request.data.apiKey
    const query = request.data.query
    const documents = request.data.documents
    let callback = async function (documents) {
      // Create QA chain
      console.log('QUERY: ' + query)
      console.log('TRYING REMOVING LAST PAGE')
      return chain.call({ // Make sure to return the promise here
        input_documents: documents,
        question: query
      }).then(res => {
        // if stored max pages nothing, else store max pages
        return res // Return the result so it can be used in the next .then()
      }).catch(async err => { // Handle the error properly
        if (err.toString().startsWith('Error: 429')) {
          documents.pop()
          if (documents.length === 0) {
            return { error: 'All documents removed, no results found.' }
          }
          return resolveWithEmbeddings(documents) // Return the callback promise
        } else {
          return { error: 'An error has occurred during callback' }
        }
      })
    }

    let resolveWithEmbeddings = async function (documents) {
      let results
      try {
        const splitter = new TokenTextSplitter({
          chunkSize: 500,
          chunkOverlap: 20
        })
        const output = await splitter.splitDocuments(documents)
        // Create LLM
        const docsearch = await MemoryVectorStore.fromDocuments(
          output, new OpenAIEmbeddings({ openAIApiKey: apiKey })
        )
        results = await docsearch.similaritySearch(query, 22)
      } catch (err) {
        return { error: 'An error has occurred loading embeddings' }
      }
      const chainA = loadQAStuffChain(model)
      // Create QA chain
      console.log('QUERY: ' + query)
      console.log('TRYING WITH EMBEDDINGS')
      return chainA.call({
        input_documents: results,
        question: query
      }).then(res => {
        // if stored max pages nothing, else store max pages
        return res // Return the result so it can be used in the next .then()
      }).catch(async err => {
        console.log(err.toString())
        // Handle the error properly
        return { error: 'An error has occurred with embeddings' }
      })
    }
    // create model
    let totalCompletionTokens = 0
    let totalPromptTokens = 0
    let totalExecutionTokens = 0

    const model = new ChatOpenAI({
      temperature: 0,
      callbacks: [
        {
          handleLLMEnd: (output, runId, parentRunId, tags) => {
            const { completionTokens, promptTokens, totalTokens } = output.llmOutput?.tokenUsage || { completionTokens: 0, promptTokens: 0, totalTokens: 0 }

            totalCompletionTokens += completionTokens
            totalPromptTokens += promptTokens
            totalExecutionTokens += totalTokens

            console.log(`Total completion tokens: ${totalCompletionTokens}`)
            console.log(`Total prompt tokens: ${totalPromptTokens}`)
            console.log(`Total execution tokens: ${totalExecutionTokens}`)
          }
        }
      ],
      modelName: 'gpt-3.5-turbo',
      openAIApiKey: apiKey,
      modelKwargs: {
        'response_format': {
          type: 'json_object'
        }
      }
    })

    // Create QA chain
    const chain = loadQAStuffChain(model)
    console.log('QUERY: ' + query)
    return chain.call({ // Return the promise here as well
      input_documents: documents,
      question: query
    }).then(res => {
      return res // Return the result so it can be used in the next .then()
    }).catch(async err => {
      console.log(err.toString())
      if (err.toString().startsWith('Error: 429')) {
        documents.pop()
        if (documents.length === 0) {
          return { error: 'All documents removed, no results found.' }
        }
        return callback(documents)
      } else if (err.toString().startsWith('Error: 401')) {
        return { error: 'Incorrect API key provided.' }
      } else {
        return { error: 'An error has occurred trying first call.' }
      }
    })
  }

  async askLLMOpenAIBasicPlan (request) {
    const apiKey = request.data.apiKey
    const query = request.data.query
    // create model
    let totalCompletionTokens = 0
    let totalPromptTokens = 0
    let totalExecutionTokens = 0

    const model = new ChatOpenAI({
      temperature: 0,
      callbacks: [
        {
          handleLLMEnd: (output, runId, parentRunId, tags) => {
            const { completionTokens, promptTokens, totalTokens } = output.llmOutput?.tokenUsage || { completionTokens: 0, promptTokens: 0, totalTokens: 0 }

            totalCompletionTokens += completionTokens
            totalPromptTokens += promptTokens
            totalExecutionTokens += totalTokens

            console.log(`Total completion tokens: ${totalCompletionTokens}`)
            console.log(`Total prompt tokens: ${totalPromptTokens}`)
            console.log(`Total execution tokens: ${totalExecutionTokens}`)
          }
        }
      ],
      modelName: 'gpt-3.5-turbo',
      openAIApiKey: apiKey,
      modelKwargs: {
        'response_format': {
          type: 'json_object'
        }
      }
    })

    const promptTemplate = PromptTemplate.fromTemplate(
      '{query}'
    )
    // Create QA chain
    const chain = promptTemplate.pipe(model)
    return chain.invoke({ query: query }).then(res => {
      return res.text // Return the result so it can be used in the next .then()
    }).catch(async err => {
      console.log(err.toString())
      if (err.toString().startsWith('Error: 429')) {
        return { error: 'Incorrect API key provided.' + err.toString() }
      } else if (err.toString().startsWith('Error: 401')) {
        return { error: 'Incorrect API key provided.' }
      } else {
        return { error: 'An error has occurred trying first call.' }
      }
    })
  }
}

module.exports = LLMManagerBackground // Use module.exports for CommonJS
