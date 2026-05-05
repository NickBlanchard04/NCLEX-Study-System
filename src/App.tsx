import { BrowserRouter } from 'react-router-dom'
import { AppShell } from './app/AppShell'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell />
    </BrowserRouter>
  )
}

export default App
