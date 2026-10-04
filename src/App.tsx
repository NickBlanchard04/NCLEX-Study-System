import { BrowserRouter } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { RouteSeo } from './seo/RouteSeo'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <RouteSeo />
      <AppShell />
    </BrowserRouter>
  )
}

export default App
