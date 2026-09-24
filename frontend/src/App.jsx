import React from 'react'
import Navbar from './components/Navbar'
import {Routes,Route, useLocation} from 'react-router-dom'
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

const App = () =>{
const isAdminRoute = useLocation().pathname.startsWith('/admin')

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
        <Route path="/admin" element={<Layout />}>
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