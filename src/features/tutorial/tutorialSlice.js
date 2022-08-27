import { createSlice } from '@reduxjs/toolkit'
export const tutorialSlice = createSlice({
  name: 'tutorial',
  initialState: {
    tutorials: [
      {
        description: "Welcome to the tutorial of Mi Mi's Draw Machine"
      },
      {
        selector: ".straw",
        description: "Here's your straws."
      },
      {
        id: "btn-draw",
        description: "Hit draw button to draw a straw from above!"
      },
      {
        selector: ".straw-item",
        description: "Let's look more detail about your straw."
      },
      {
        selector: ".straw-item div",
        description: "The name of the straw. Trival, huh?"
      },
      {
        selector: ".straw-item .btn-color",
        description: "Change the color of your straw by the palette here."
      },
      {
        selector: ".straw-item .btn-trash",
        description: "And, of course, you can easily delete your straw here."
      },
      {
        selector: ".straw-item:last-child",
        description: "Add a straw by entering something here,"
      },
      {
        selector: ".straw-item:last-child .btn-icon",
        description: <>Then click `+` button to commit your change.<br />Or just simply hit `enter` key.</>
      },
      {
        id: "btn-save-as-preset",
        description: "For your convenient, you can save current straws preset by a single click."
      },
      {
        id: "btn-load-from-presets",
        description: "And recover any of saved preset here."
      },
      {
        id: "drawing-result-card",
        description: "Once after your first draw, you can find your drawing results here."
      },
      {
        id: "btn-clear-results",
        description: "Click here to clear all your drawing results."
      }
    ], // array of Straw
    display: {
      description: "Welcome to the tutorial of Mi Mi's Draw Machine"
    },
    currentPosition: 0,
    showTutorial: true
  },
  reducers: {
    startTutorial: (state) => {
      state.currentPosition = 0
      state.showTutorial = true
      state.display = state.tutorials[state.currentPosition]
    },
    next: (state) => {
      if(!state.showTutorial) return;

      state.currentPosition += 1
      if(state.currentPosition >= state.tutorials.length) {
        state.currentPosition = state.tutorials.length - 1;
      }
      state.display = state.tutorials[state.currentPosition]
    },
    previous: (state) => {
      if(!state.showTutorial) return;
      state.currentPosition -= 1
      if(state.currentPosition < 0) {
        state.currentPosition = 0
        state.showTutorial = false;
      }
      state.display = state.tutorials[state.currentPosition]
    },
    endTutorial: (state) => {
      state.showTutorial = false;
    }
  }
})

export const { 
  startTutorial, next, previous, endTutorial } = tutorialSlice.actions

export default tutorialSlice.reducer
