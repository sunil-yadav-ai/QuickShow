import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { MenuIcon, SearchIcon, TicketPlus, XIcon } from 'lucide-react'
import { useClerk, UserButton, useUser } from '@clerk/react'

const Navbar = () => {
    const [isOpen, setOpen] = useState(false)
    const naviage = useNavigate()

    const {user} = useUser()
    const {openSignIn} = useClerk()

    const closeMenu = () => {
        scrollTo(0, 0)
        setOpen(false)
    }

    return (
        <div className="fixed top-0 left-0 z-50 w-full flex items-center justify-between px-6 md:px-16 lg:px-36 py-5">

            {/* Logo */}
            <Link to="/" className="max-md:flex-1">
                <img
                    src={assets.logo}
                    alt="Logo"
                    className="w-36 h-auto"
                />
            </Link>

            {/* Navigation */}
            <div
                className={`max-md:absolute max-md:top-0 max-md:left-0 max-md:font-medium max-md:text-lg z-50 flex flex-col md:flex-row items-center max-md:justify-center gap-8 md:px-8 py-3 max-md:h-screen md:rounded-full backdrop-blur bg-black/70 md:bg-white/10 md:border border-gray-300/20 overflow-hidden transition-all duration-300 ${
                    isOpen ? 'max-md:w-full' : 'max-md:w-0'
                }`}
            >

                {/* Close */}
                <XIcon
                    className="md:hidden absolute top-6 right-6 w-6 h-6 cursor-pointer"
                    onClick={() => setOpen(false)}
                />

                <Link onClick={closeMenu} to="/">
                    Home
                </Link>

                <Link onClick={closeMenu} to="/movies">
                    Movies
                </Link>

                <Link onClick={closeMenu} to="/">
                    Theaters
                </Link>

                <Link onClick={closeMenu} to="/">
                    Releases
                </Link>

                <Link onClick={closeMenu} to="/favorite">
                    Favorites
                </Link>

            </div>

            {/* Right side */}
            <div className="flex items-center gap-8">

                <SearchIcon className="max-md:hidden w-6 h-6 cursor-pointer" />
                {!user ? (<button onClick={openSignIn} className="px-4 py-1 sm:px-7 sm:py-2 bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer">
                    Login
                </button>):(
                    <UserButton>
                        <UserButton.MenuItems>
                            <UserButton.Action label='My Bookings' labelIcon={<TicketPlus width={15}/>} onClick={()=> naviage('/my-bookings')}/>
                        </UserButton.MenuItems>
                    </UserButton>
                )}

                

            </div>

            {/* Mobile menu button */}
            <MenuIcon
                className="max-md:ml-4 md:hidden w-8 h-8 cursor-pointer"
                onClick={() => setOpen(true)}
            />

        </div>
    )
}

export default Navbar