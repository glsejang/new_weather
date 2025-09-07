// main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter, HashRouter } from 'react-router-dom'

import 'bootstrap/dist/css/bootstrap.min.css'
import './index.scss'
import './week.scss'
import './App.scss'
import './todos.scss'
import './setting.scss'

import App from './App.jsx'
import store from './store'

const isProd = import.meta.env.MODE === 'production'
// GitHub Pages(서브경로) → HashRouter가 가장 안전
const RouterComp = isProd ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      {/* prod(HashRouter)에는 basename 주지 말기! */}
      {isProd ? (
        <RouterComp>
          <App />
        </RouterComp>
      ) : (
        <RouterComp basename={import.meta.env.BASE_URL}>
          <App />
        </RouterComp>
      )}
    </Provider>
  </StrictMode>
)
