import React from 'react'
import Navbar from './components/Navbar'
import {Routes,Route, useLocation, Navigate} from 'react-router-dom'
import Home from './pages/Home'
import Movies from './pages/Movies'
import MovieDetails from './pages/MovieDetails'
import SeatLayout from './pages/SeatLayout'
import MyBookings from './pages/MyBookings'
import Favorite from './pages/Favorite'
import { Toaster } from "react-hot-toast";
import Footer from './components/Footer'
import Layout from './pages/adimn/Layout'
import Dashboard from './pages/adimn/Dashboard'
import Addshow from './pages/adimn/AddShow'
import ListShows from './pages/adimn/ListShows'
import Listbookings from './pages/adimn/ListBookings'
import { useAppContext } from './context/AppContex'
import { SignIn } from '@clerk/react'
import Loading from './components/Loading'

const App = () =>{
const isAdminRoute = useLocation().pathname.startsWith('/admin')
const {
  user,
  isLoaded,
  isSignedIn,
  isAdmin,
  isAdminLoading,
  adminCheckedUserId,
  adminCheckError,
  fetchIsAdmin,
} = useAppContext()

  return (
    <>
      <Toaster/>
      {!isAdminRoute && <Navbar/>}
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/home' element={<Home/>}/>
        <Route path='/movies' element={<Movies/>} />
        <Route path='/movies/:id' element={<MovieDetails/>} />
        <Route path='/movies/:id/:date' element={<SeatLayout/>} />
        <Route path='/my-bookings' element={<MyBookings/>} />
        <Route path='/favorite' element={<Favorite/>} />
        <Route path="/admin" element={
          !isLoaded ? (
            <Loading />
          ) : !isSignedIn || !user ? (
            <div className='min-h-screen flex justify-center items-center'>
              <SignIn fallbackRedirectUrl={'/admin'}/>
            </div>
          ) : isAdminLoading || adminCheckedUserId !== user.id ? (
            <Loading />
          ) : adminCheckError ? (
            <div className='min-h-screen flex flex-col justify-center items-center gap-4'>
              <p>
                Admin access check failed
                {adminCheckError.status ? ` (HTTP ${adminCheckError.status})` : ''}.
                {' '}{adminCheckError.message}
              </p>
              <button
                type='button'
                onClick={fetchIsAdmin}
                className='px-4 py-2 bg-primary rounded-full'
              >
                Retry
              </button>
            </div>
          ) : isAdmin ? (
            <Layout />
          ) : (
            <Navigate to="/" replace />
          )
        }>
          <Route index element={<Dashboard />} />
          <Route path="add-shows" element={<Addshow />} />
          <Route path="list-shows" element={<ListShows />} />
          <Route path="list-bookings" element={<Listbookings />} />
          </Route>
        

      </Routes>
      {!isAdminRoute && <Footer/>}

    </>
  )
}

export default App