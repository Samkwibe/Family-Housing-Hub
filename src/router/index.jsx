// src/router/index.jsx
import { Routes, Route } from 'react-router-dom'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Dashboard from '../pages/Dashboard'
import Rent from '../pages/Rent'
import Maintenance from '../pages/Maintenance'
import Documents from '../pages/Documents'
import Messages from '../pages/Messages'
import Landlord from '../pages/Landlord'
import Profile from '../pages/Profile'
import ChildDashboard from '../pages/ChildDashboard'
import ChildrenSavings from '../pages/ChildrenSavings'
import NearbyPlaces from '../pages/NearbyPlaces'
import ProtectedRoute from '../components/ProtectedRoute'
import Layout from '../components/Layout'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/rent" element={
        <ProtectedRoute>
          <Layout>
            <Rent />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/maintenance" element={
        <ProtectedRoute>
          <Layout>
            <Maintenance />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/documents" element={
        <ProtectedRoute>
          <Layout>
            <Documents />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/messages" element={
        <ProtectedRoute>
          <Layout>
            <Messages />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/landlord" element={
        <ProtectedRoute>
          <Layout>
            <Landlord />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <Layout>
            <Profile />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/child-dashboard" element={
        <ProtectedRoute>
          <ChildDashboard />
        </ProtectedRoute>
      } />
      <Route path="/children" element={
        <ProtectedRoute>
          <Layout>
            <ChildrenSavings />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/nearby-places" element={
        <ProtectedRoute>
          <Layout>
            <NearbyPlaces />
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}