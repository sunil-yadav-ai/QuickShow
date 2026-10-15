
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useAuth, useUser } from "@clerk/react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [shows, setShows] = useState([]);
    const [favoriteMovies, setFavoriteMovies] = useState([]);

    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();

    const location = useLocation();
    const navigate = useNavigate();

    const fetchIsAdmin = async () => {
        try {
            const token = await getToken();

            if (!token) {
                setIsAdmin(false);
                return;
            }

            const { data } = await axios.get("/api/admin/is-admin", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const admin = data.success === true && data.isAdmin === true;
            setIsAdmin(admin);

            if (!admin && location.pathname.startsWith("/admin")) {
                navigate("/", { replace: true });
                toast.error("You are not authorized to access the admin dashboard");
            }
        } catch (error) {
            setIsAdmin(false);
            const status = error.response?.status;
            console.error("Admin check request failed:", {
                status,
                code: error.code,
                endpoint: "/api/admin/is-admin",
            });

            if (location.pathname.startsWith("/admin")) {
                navigate("/", { replace: true });
                if (status === 401) {
                    toast.error("Please sign in again to verify admin access");
                } else if (status === 403) {
                    toast.error("You are not authorized to access the admin dashboard");
                } else {
                    toast.error("Unable to verify admin access");
                }
            }
        }
    };

    const fetchShows = async () => {
        try {
            const { data } = await axios.get("/api/show/all");

            if (data.success) {
                setShows(data.shows);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Fetch shows error:", error);
        }
    };

    const fetchFavoriteMovie = async () => {
        try {
            const token = await getToken();

            if (!token) return;

            const { data } = await axios.get("/api/user/favorites", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (data.success) {
                setFavoriteMovies(data.movies);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Fetch favorite movies request failed:", {
                status: error.response?.status,
                code: error.code,
                endpoint: "/api/user/favorites",
            });
        }
    };

    useEffect(() => {
        fetchShows();
    }, []);

    useEffect(() => {
        if (!isLoaded) return;

        if (user) {
            fetchIsAdmin();
            fetchFavoriteMovie();
        } else {
            setIsAdmin(false);
            setFavoriteMovies([]);
        }
    }, [user, isLoaded]);

    const value = {
        axios,
        user,
        getToken,
        navigate,
        isAdmin,
        shows,
        favoriteMovies,
        fetchShows,
        fetchIsAdmin,
        fetchFavoriteMovie,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
