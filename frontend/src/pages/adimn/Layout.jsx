// import React, { useEffect } from 'react'
// import AdminNavbar from '../../components/admin/adminNavbar'
// import Adminsidebar from '../../components/admin/adminSidebar'
// import { Outlet } from 'react-router-dom'
// import {useAppContext} from '../../context/AppContex'
// import Loading from '../../components/Loading'

// const Layout = () => {

//     const {isAdmin,fetchIsAdmin} = useAppContext()
    

//     useEffect(()=>{
//         fetchIsAdmin()
//     },[fetchIsAdmin])




//     return isAdmin ? (
//         <>
//             <AdminNavbar />

//             <div className="flex">
//                 <Adminsidebar />

//                 <div className="flex-1 px-4 py-6 md:px-10 md:py-8 h-[calc(100vh-64px)] overflow-y-auto">
//                     <Outlet />
//                 </div>
//             </div>
//         </>
//     ) : <Loading/>
// }

// export default Layout







import React from 'react';
import AdminNavbar from '../../components/admin/adminNavbar';
import Adminsidebar from '../../components/admin/adminSidebar';
import { Outlet, Navigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContex';
import Loading from '../../components/Loading';

const Layout = () => {
const {
isAdmin,
isAdminLoading,
isLoaded,
isSignedIn,
adminCheckError
} = useAppContext();


// Wait until Clerk authentication is loaded
if (!isLoaded || isAdminLoading) {
    return <Loading />;
}

// Redirect users who are not signed in
if (!isSignedIn) {
    return <Navigate to="/" replace />;
}

// Show an error instead of infinite loading
if (adminCheckError) {
    return (
        <div className="p-8 text-center">
            <h2 className="text-xl font-bold text-red-500">
                Admin Verification Failed
            </h2>
            <p className="mt-2">
                {adminCheckError.message}
            </p>
            <p className="mt-2 text-sm text-gray-500">
                Error code: {adminCheckError.status ?? 'Network error'}
            </p>
            <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
            >
                Retry
            </button>
        </div>
    );
}

// Block users without admin permission
if (!isAdmin) {
    return (
        <div className="p-8 text-center">
            <h2 className="text-xl font-bold">
                Access Denied
            </h2>
            <p className="mt-2">
                You do not have permission to access this page.
            </p>
        </div>
    );
}

// Render admin dashboard
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
);


};

export default Layout;
