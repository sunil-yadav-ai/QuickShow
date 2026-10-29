import React from 'react'
import {
    LayoutDashboardIcon,
    PlusSquareIcon,
    ListIcon,
    ListCollapseIcon
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { assets } from '../../assets/assets'

const Adminsidebar = () => {

    const user = {
        firstName: 'Admin',
        lastName: 'User',
        imageUrl: assets.profile,
    }

    const adminNavlinks = [
        {
            name: 'Dashboard',
            path: '/admin',
            icon: LayoutDashboardIcon
        },
        {
            name: 'Add Shows',
            path: '/admin/add-shows',
            icon: PlusSquareIcon
        },
        {
            name: 'List Shows',
            path: '/admin/list-shows',
            icon: ListIcon
        },
        {
            name: 'List Bookings',
            path: '/admin/list-bookings',
            icon: ListCollapseIcon
        }
    ]

    return (
        <nav aria-label="Admin navigation" className="h-[calc(100vh-64px)] flex w-12 shrink-0 flex-col items-center border-r border-gray-300/20 pt-5 text-sm md:w-60 md:pt-8">

            <img
                className="h-9 md:h-14 w-9 md:w-14 rounded-full mx-auto"
                src={user.imageUrl}
                alt=""
                aria-hidden="true"
            />

            <p className="mt-2 text-base max-md:hidden">
                {user.firstName} {user.lastName}
            </p>

            <div className="w-full">
                {adminNavlinks.map((link, index) => {
                    const Icon = link.icon

                    return (
                        <NavLink
                            end
                            key={index}
                            to={link.path}
                            aria-label={link.name}
                            className={({ isActive }) =>
                                `relative flex items-center max-md:justify-center gap-2 w-full py-2.5 md:pl-10 first:mt-6 text-gray-400 ${
                                    isActive
                                        ? 'bg-primary/15 text-primary group'
                                        : ''
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon className="w-5 h-5" />

                                    <p className="max-md:hidden">
                                        {link.name}
                                    </p>

                                    <span
                                        className={`w-1.5 h-10 rounded-l right-0 absolute ${
                                            isActive ? 'bg-primary' : ''
                                        }`}
                                    ></span>
                                </>
                            )}
                        </NavLink>
                    )
                })}
            </div>

        </nav>
    )
}

export default Adminsidebar