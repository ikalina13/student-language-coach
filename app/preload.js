// The only bridge between the screens and the computer. Screens call window.salita.*
const { contextBridge, ipcRenderer } = require('electron');

const call = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('salita', {
  auth: {
    register: call('auth:register'),
    login: call('auth:login'),
    logout: call('auth:logout'),
    current: call('auth:current'),
    listUsers: call('auth:listUsers'),
    remove: call('auth:remove'),
  },
  progress: {
    get: call('progress:get'),
    toggleLearned: call('progress:toggleLearned'),
    completeStory: call('progress:completeStory'),
    markSentence: call('progress:markSentence'),
    recordQuiz: call('progress:recordQuiz'),
    setSettings: call('progress:setSettings'),
    stats: call('progress:stats'),
  },
  content: { all: call('content:all') },
  report: { exportPdf: call('report:exportPdf') },
  prefs: { getLast: call('prefs:getLast'), setLast: call('prefs:setLast') },
});
