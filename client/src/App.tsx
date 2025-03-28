import { Route, Routes } from "react-router-dom"
import HomePage from "./pages/HomePage"
import Signup from "./pages/Signup"
import LearnMore from "./pages/LearnMore"
import { Toaster } from "./components/ui/sonner"
import Login from "./pages/Login"
import DriverDashboard from "./pages/DriverDashboard"
import AdminDashboard from "./pages/AdminDashboard"

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sign-up" element={<Signup />} /> 
        <Route path="/learn-more" element={<LearnMore />} />
        <Route path="/login" element={<Login />} />
        <Route path="/user/:userId/dashboard" element={<DriverDashboard/>} />
        <Route path="/admin/:companySlug/dashboard" element={<AdminDashboard/>} />
        <Route path="*" element={<h1>Not Found</h1>} />
      </Routes>
      <Toaster/>
    </>
  )
}

export default App
