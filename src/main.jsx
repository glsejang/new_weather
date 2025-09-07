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
// 서브경로로 배포한다면 해시 라우터가 가장 안전
const Router = isProd ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <Router basename={import.meta.env.BASE_URL}>
        <App />
      </Router>
    </Provider>
  </StrictMode>,
)
