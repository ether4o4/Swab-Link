import { Navigate, Route, Routes } from 'react-router-dom'
import { WorkOrderList } from './pages/WorkOrderList'
import { WorkOrderForm } from './pages/WorkOrderForm'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WorkOrderList />} />
      <Route path="/work-orders/:id" element={<WorkOrderForm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
