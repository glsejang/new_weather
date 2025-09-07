import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux'

import 'bootstrap/dist/css/bootstrap.min.css';
import './index.scss'
import './week.scss'
import './App.scss';
import './todos.scss'
import "./setting.scss";

import App from './App.jsx'
import store from './store'               

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
