import Alerts from './utils/Alerts'
import swal from 'sweetalert2'

window.onload = () => {
  if (window.location.href.includes('pages/modelConfiguration.html')) {
    let modelConfiguration = new ModelConfiguration()
    modelConfiguration.init()
  }
}

class ModelConfiguration {
  init () {
    chrome.runtime.sendMessage({ scope: 'model', cmd: 'getModels' }, (models) => {
      this.createModelList(models.models)
      chrome.runtime.sendMessage({ scope: 'parameters', cmd: 'getParameters' }, (data) => {
        this.updateOptionsList(data.parameters)
        document.querySelector('.add-button').addEventListener('click', () => {
          let input = document.querySelector('#modelInputName').value
          this.addNewModel(input)
        })
      })
    })
  }

  createModelList (models) {
    // Function to handle the editing logic */
    const self = this
    const list = document.getElementById('modelList')
    list.innerHTML = '' // Clear the list before adding new items
    models.forEach(model => {
      // Get the model list container from the document
      // Create the list item
      const listItem = document.createElement('li')
      // Create the div for model info
      const modelInfo = document.createElement('div')
      modelInfo.className = 'model-info'
      // Create the checkbox
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.className = 'checkbox'
      checkbox.id = 'checkbox_' + model.id
      checkbox.checked = model.selected // Set checked state based on model info
      checkbox.addEventListener('change', function () {
        // Find the model associated with this checkbox
        const modelIndex = models.findIndex(m => m.id === model.id) // Find the index of the model
        if (modelIndex !== -1) {
          // Update the model's selected status within the array
          models[modelIndex].selected = this.checked

          // Send the updated models array back to the central storage
          chrome.runtime.sendMessage({
            scope: 'model',
            cmd: 'setModels',
            data: { models: models }
          }, (models) => {
            console.log('Models updated:', models)
            this.createModelList(models.models)
          })
        } else {
          console.log('Model not found with ID:', model.id)
        }
      })
      // Add checkbox to model info div
      modelInfo.appendChild(checkbox)
      // Create the edit button
      const editButton = document.createElement('button')
      editButton.className = 'button'
      editButton.textContent = 'Edit'
      // Attach an event handler to the button
      editButton.addEventListener('click', () => {
        self.editModel(model.id, models)
      })
      // Append the edit button right after the checkbox
      modelInfo.appendChild(editButton)
      let span = document.createElement('span')
      span.className = 'model-name'
      span.textContent = model.name
      span.style.marginLeft = '5px'
      // Add model name text to model info div
      modelInfo.appendChild(span)
      // Append model info to the list item
      listItem.appendChild(modelInfo)
      // Append the list item to the list
      list.appendChild(listItem)
    })
  }

  editModel (modelId, models) {
    console.log('Editing model with ID:', modelId)
    const model = models.find(model => model.id === modelId)
    let modelName = model.name
    let description = model.description
    let numberOfQuestions = model.numberOfQuestions
    let html = '<div>' +
      '<span style="text-align: left;">Name</span>' +
      '<input id="name" class="swal2-input customizeInput" value="' + modelName + '"/>' +
      '</span>' +
      '<div>' +
      '<span style="text-align: left;">Description</span>' +
      '<textarea id="description" class="swal2-input customizeInput" placeholder="Description">' + description + '</textarea>' +
      '</div>'
    html += '<span style="text-align:left">Number of associated questions:</span><input type="number" min="1" max="20" id="numberOfQuestions" class="swal2-input customizeInput" placeholder="Number of questions" value="' + numberOfQuestions + '"></input></div>'
    Alerts.threeOptionsAlert({
      title: 'Modifying model',
      html: html,
      willOpen: () => {
        let element = document.querySelector('.swal2-popup')
        element.style.width = '900px'
        let description = document.querySelector('#description')
        description.style.height = '400px'
      },
      preConfirm: () => {
        // Retrieve values from inputs
        modelName = document.getElementById('name').value
        description = document.getElementById('description').value
        numberOfQuestions = document.getElementById('numberOfQuestions').value
      },
      callback: () => {
        // Save model
        chrome.runtime.sendMessage({ scope: 'model', cmd: 'getModels' }, ({ models }) => {
          if (models) {
            const modelIndex = models.findIndex(m => m.id === model.id) // Find the index of the model
            if (modelIndex !== -1) {
              // Update the model's selected status within the array
              models[modelIndex].name = modelName
              models[modelIndex].description = description
              models[modelIndex].numberOfQuestions = numberOfQuestions
              chrome.runtime.sendMessage({
                scope: 'model',
                cmd: 'setModels',
                data: { models: models }
              }, (models) => {
                console.log('Model added:', model)
                this.createModelList(models.model)
              })
            }
          }
        })
      },
      denyButtonText: 'Delete',
      denyButtonColor: '#d33',
      denyCallback: () => {
        this.deleteModel(model.id, models)
      }
    })
  }

  addNewModel (modelName) {
    let description
    let numberOfQuestions
    let html = '<div>' +
      '<span style="text-align: left;">Name</span>' +
      '<input id="name" class="swal2-input customizeInput" value="' + modelName + '"/>' +
      '</span>' +
      '<div>' +
      '<span style="text-align: left;">Description</span>' +
      '<textarea id="description" class="swal2-input customizeInput" placeholder="Description"></textarea>' +
      '</div>'
    html += '<span style="text-align:left">Number of associated questions:</span><input type="number" min="1" max="20" id="numberOfQuestions" class="swal2-input customizeInput" placeholder="Number of questions"></input></div>'
    Alerts.threeOptionsAlert({
      title: 'Fill out your model',
      html: html,
      showDenyButton: false,
      willOpen: () => {
        let element = document.querySelector('.swal2-popup')
        element.style.width = '900px'
        let description = document.querySelector('#description')
        description.style.height = '400px'
      },
      preConfirm: () => {
        // Retrieve values from inputs
        modelName = document.getElementById('name').value
        description = document.getElementById('description').value
        numberOfQuestions = document.getElementById('numberOfQuestions').value
        if (!numberOfQuestions) {
          // Throw an error or reject a promise to prevent closing the alert
          const swal = require('sweetalert2')
          swal.showValidationMessage('Please provide a rating.') // This will display an error message in the SweetAlert
          return false // Prevents the alert from closing
        }
        if (!description) {
          // Throw an error or reject a promise to prevent closing the alert
          const swal = require('sweetalert2')
          swal.showValidationMessage('Please provide a description.') // This will display an error message in the SweetAlert
          return false // Prevents the alert from closing
        }
        if (!modelName) {
          // Throw an error or reject a promise to prevent closing the alert
          const swal = require('sweetalert2')
          swal.showValidationMessage('Please provide a name.') // This will display an error message in the SweetAlert
          return false // Prevents the alert from closing
        }
      },
      callback: () => {
        // Save model
        chrome.runtime.sendMessage({ scope: 'model', cmd: 'getModels' }, ({ models }) => {
          if (models) {
            let newId = this.findAvailableId(models)
            let model = {
              name: modelName,
              description: description,
              numberOfQuestions: numberOfQuestions,
              selected: true,
              id: newId
            }
            models.push(model)
            chrome.runtime.sendMessage({ scope: 'model', cmd: 'setModels', data: { models: models } }, (newModels) => {
              console.log('Model added:', model)
              this.createModelList(models)
            })
          }
        })
      }
    })
  }

  deleteModel (modelId, models) {
    // Filter out the model with the given ID
    const filteredModels = models.filter(model => model.id !== modelId)
    // Send the updated models array back to the central storage
    chrome.runtime.sendMessage({
      scope: 'model',
      cmd: 'setModels',
      data: { models: filteredModels }
    }, () => {
      console.log('Model deleted:', modelId)
      this.createModelList(filteredModels) // Optionally refresh the list if you have a UI component
    })
  }

  updateOptionsList (parameters) {
    // Function to handle the editing logic */
    const followUpQuestion = document.getElementById('followUpQuestion')
    followUpQuestion.checked = parameters.followUpQuestion
    followUpQuestion.addEventListener('change', () => {
      parameters.followUpQuestion = followUpQuestion.checked
      this.updateParameters(parameters)
    })
    const userProvidedAnswer = document.getElementById('userProvidedAnswer')
    userProvidedAnswer.checked = parameters.userProvidedAnswer
    userProvidedAnswer.addEventListener('change', () => {
      parameters.userProvidedAnswer = userProvidedAnswer.checked
      this.updateParameters(parameters)
    })
    const suggestQuestionsByLLM = document.getElementById('suggestQuestionsByLLM')
    suggestQuestionsByLLM.checked = parameters.suggestQuestionsByLLM
    suggestQuestionsByLLM.addEventListener('change', () => {
      parameters.suggestQuestionsByLLM = suggestQuestionsByLLM.checked
      this.updateParameters(parameters)
    })
    const showSource = document.getElementById('showSource')
    showSource.checked = parameters.showSource
    showSource.addEventListener('change', () => {
      parameters.showSource = showSource.checked
      this.updateParameters(parameters)
    })
  }

  findAvailableId (models) {
    let id = models.length // Start checking from the length of the array
    let ids = new Set(models.map(model => model.id)) // Create a set of existing IDs for quick lookup

    // Check if the id exists in the models array, increment if it does
    while (ids.has(id)) {
      id++ // Increment ID if the current one is already used
    }

    return id // Return the first available ID not found in the set
  }

  updateParameters (parameters) {
    chrome.runtime.sendMessage({
      scope: 'parameters',
      cmd: 'setParameters',
      data: { parameters: parameters }
    }, (parameters) => {
      console.log('Parameters updated:', parameters)
      // this.createModelList(models.model)
    })
  }
}

export default ModelConfiguration
