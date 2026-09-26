import React from 'react'
import AdminNavbar from '../../components/admin/adminNavbar'
import Adminsidebar from '../../components/admin/adminSidebar'
import { Outlet } from 'react-router-dom'

const Layout = () => {
    return (
        <>
            <AdminNavbar />

            <div className="flex">
                <Adminsidebar />

                <div className="flex-1 px-4 py-6 md:px-10 md:py-8 h-[calc(100vh-64px)] overflow-y-auto">
                    <Outlet />
                </div>
            </div>
        </>
    )
}

export default Layout