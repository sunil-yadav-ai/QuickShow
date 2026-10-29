import React, { lazy, Suspense } from 'react'
import Navbar from './components/Navbar'
import {Routes,Route, useLocation, Navigate} from 'react-router-dom'
import Home from './pages/Home'
import { Toaster } from "react-hot-toast";
import Footer from './components/Footer'
import { useAppContext } from './context/AppContex'
import Loading from './components/Loading'
import SEO from './components/SEO'

const Movies = lazy(() => import('./pages/Movies'))
const MovieDetails = lazy(() => import('./pages/MovieDetails'))
const SeatLayout = lazy(() => import('./pages/SeatLayout'))
const MyBookings = lazy(() => import('./pages/MyBookings'))
const Favorite = lazy(() => import('./pages/Favorite'))
const Layout = lazy(() => import('./pages/adimn/Layout'))
const Dashboard = lazy(() => import('./pages/adimn/Dashboard'))
const Addshow = lazy(() => import('./pages/adimn/AddShow'))
const ListShows = lazy(() => import('./pages/adimn/ListShows'))
const Listbookings = lazy(() => import('./pages/adimn/ListBookings'))
const NotFound = lazy(() => import('./pages/NotFound'))
const SignIn = lazy(() =>
  import('@clerk/react').then((clerk) => ({ default: clerk.SignIn }))
)

const App = () =>{
const pathname = useLocation().pathname
const isAdminRoute = pathname.startsWith('/admin')
const isSeatRoute = /^\/movies\/[^/]+\/[^/]+$/.test(pathname)
const isPrivateRoute =
  isAdminRoute ||
  isSeatRoute ||
  ['/favorite', '/my-bookings'].includes(pathname) ||
  pathname.startsWith('/loading/')
const isMovieDetailsRoute = /^\/movies\/[^/]+$/.test(pathname)
const isUnknownRoute =
  !['/', '/home', '/movies', '/favorite', '/my-bookings', '/admin'].includes(pathname) &&
  !isSeatRoute &&
  !isMovieDetailsRoute &&
  !pathname.startsWith('/loading/') &&
  !pathname.startsWith('/admin/')
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
      {(isPrivateRoute || isUnknownRoute || pathname === '/movies' || isMovieDetailsRoute) && <SEO
        title={
          isAdminRoute
            ? 'Admin | QuickShow'
            : isPrivateRoute
              ? 'Private page | QuickShow'
              : isUnknownRoute
                ? 'Page not found | QuickShow'
                : pathname === '/movies'
                  ? 'Now Showing | Movies | QuickShow'
                  : isMovieDetailsRoute
                    ? 'Movie details | QuickShow'
                    : 'QuickShow - Book Movie Tickets Online'
        }
        description={
          isPrivateRoute
            ? 'Private QuickShow account and booking page.'
            : isUnknownRoute
              ? 'The QuickShow page you requested could not be found.'
              : pathname === '/movies'
                ? 'Browse movies currently showing at QuickShow and choose a movie to view showtimes and ticket options.'
                : 'Discover movies currently showing, explore trailers and book your next cinema tickets with QuickShow.'
        }
        noIndex={isPrivateRoute || isUnknownRoute}
      />}
      <Suspense fallback={<Loading/>}>
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/home' element={<Navigate to="/" replace/>}/>
        <Route path='/movies' element={<Movies/>} />
        <Route path='/movies/:id' element={<MovieDetails/>} />
        <Route path='/movies/:id/:date' element={<SeatLayout/>} />
        <Route path='/my-bookings' element={<MyBookings/>} />
        <Route path='/loading/:nextUrl' element={<Loading/>} />
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
        <Route path="*" element={<NotFound/>}/>
      </Routes>
      </Suspense>
      {!isAdminRoute && <Footer/>}

    </>
  )
}

export default App