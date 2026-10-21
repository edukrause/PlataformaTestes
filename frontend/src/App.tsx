import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Vazio } from './components/ui'
import { Assistente } from './pages/Assistente'
import { ExecucaoDetalhe } from './pages/ExecucaoDetalhe'
import { ListaExecucoes } from './pages/ListaExecucoes'
import { Metricas } from './pages/Metricas'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Assistente />} />
          <Route path="conversas/:id" element={<Assistente />} />
          <Route path="execucoes" element={<ListaExecucoes />} />
          <Route path="execucoes/:id" element={<ExecucaoDetalhe />} />
          <Route path="metricas" element={<Metricas />} />
          <Route path="*" element={<Vazio>Página não encontrada.</Vazio>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
